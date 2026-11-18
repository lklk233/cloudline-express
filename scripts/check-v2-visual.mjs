import {preview} from 'vite'
import {mkdir,writeFile} from 'node:fs/promises'
import {pathToFileURL} from 'node:url'
import assert from 'node:assert/strict'
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright')
const dir='docs/verification/v2'
await mkdir(dir,{recursive:true})
const server=await preview({preview:{host:'127.0.0.1',port:0}})
const url='http://127.0.0.1:'+server.httpServer.address().port
let browser
try{
  browser=await chromium.launch({executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'})
  const results=[],errors=[]
  for(const quality of ['high','low']){
    const context=await browser.newContext({viewport:{width:1280,height:720}})
    const page=await context.newPage()
    page.on('pageerror',e=>errors.push(String(e)))
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
    await page.addInitScript(q=>{
      const key='cloudline-express-settings'
      if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:4,state:{trainSpeed:0,cloudAnimationRunning:false,cloudQuality:q}}))
      window.__THREE_DEVTOOLS__=new EventTarget()
      window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{
        const r=e.detail
        if(!r.isWebGLRenderer)return
        // Freeze the drawing resolution for deterministic pixel comparisons during UI input.
        const setRatio=r.setPixelRatio.bind(r); r.setPixelRatio=()=>setRatio(1)
        const draw=r.render.bind(r)
        r.render=(scene,camera)=>{window.snap=()=>{
          draw(scene,camera)
          const canvas=document.createElement('canvas')
          canvas.width=640;canvas.height=360
          const ctx=canvas.getContext('2d')
          ctx.drawImage(r.domElement,0,0,640,360)
          return {pixels:ctx.getImageData(0,0,640,360).data,image:canvas.toDataURL('image/jpeg',.92)}
        };draw(scene,camera)}
      })
    },quality)
    await page.goto(url)
    const ready=()=>page.waitForFunction(()=>window.snap && document.querySelector('output')?.textContent==='')
    await ready()
    await page.waitForTimeout(1800)
    const button=name=>page.getByRole('button',{name,exact:true})
    const capture=async(name,reference)=>{
      await page.waitForTimeout(130)
      const result=await page.evaluate(({name,reference})=>{
        const shot=window.snap()
        window.samples??={}
        let changed=0
        const ref=window.samples[reference]
        if(ref)for(let i=0;i<ref.length;i+=4){
          if(Math.max(...[0,1,2].map(k=>Math.abs(ref[i+k]-shot.pixels[i+k])))>5)changed++
        }
        window.samples[name]=shot.pixels
        return {changed,image:shot.image}
      },{name,reference})
      return result
    }
    const save=async(name,shot)=>writeFile(dir+'/'+name+'.jpg',Buffer.from(shot.image.split(',')[1],'base64'))
    const baseline=await capture('baseline')
    if(quality==='high')await save('region-original',baseline)
    await page.getByText('自定义配色',{exact:true}).click()
    for(const [i,id] of ['basin','bank','backdrop','lower','skyBand','vista'].entries()){
      await page.locator('.region-row').nth(i).click()
      await button('单色').click()
      const hex=page.getByLabel('HEX 色值')
      await hex.fill('#00FF44')
      await hex.press('Tab')
      const solid=await capture(id+'-solid','baseline')
      if(quality==='high')await save('region-'+id,solid)
      assert.ok(solid.changed>10,quality+' '+id+' invisible: '+solid.changed)
      await button('双色渐变').click()
      const same=await capture(id+'-equal',id+'-solid')
      assert.equal(same.changed,0,quality+' '+id+' equal endpoints differ')
      await button('终色').click()
      await hex.fill('#AB12EF')
      await hex.press('Tab')
      const grad=await capture(id+'-grad',id+'-solid')
      if(quality==='high')await save('gradient-'+id,grad)
      await button('交换').click()
      const swap=await capture(id+'-swap',id+'-grad')
      assert.ok(grad.changed>5 && swap.changed>5,quality+' '+id+' gradient invisible')
      await button('还原本区配色').click()
      const reset=await capture(id+'-reset','baseline')
      assert.equal(reset.changed,0,quality+" "+id+" reset")
      results.push({quality,id,changedSolid:solid.changed,changedGradient:grad.changed,changedSwap:swap.changed,changedEqual:same.changed,changedReset:reset.changed})
    }
    const grid=page.locator('.color-grid button')
    await page.getByText('256 色色板',{exact:true}).click()
    assert.equal(await grid.count(),256)
    await grid.first().focus()
    await page.keyboard.press('Enter')
    await grid.last().focus()
    await page.keyboard.press('Enter')
    await page.getByLabel('HEX 色值').fill('#123ABC')
    await page.getByLabel('HEX 色值').press('Tab')
    await page.screenshot({path:dir+'/editor-'+quality+'.jpg'})
    const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cloudline-express-settings')).state.overrides)
    const first=await saved()
    await page.locator('.presets button').nth(1).click()
    await page.getByLabel('HEX 色值').fill('#456DEF')
    await page.getByLabel('HEX 色值').press('Tab')
    await page.reload()
    await ready()
    assert.deepEqual((await saved()).coralSunset,first.coralSunset)
    assert.equal((await saved()).orangeGlow.vista.start,'#456DEF')
    await button('重置当前预设').click()
    assert.deepEqual((await saved()).orangeGlow,{})
    assert.deepEqual((await saved()).coralSunset,first.coralSunset)
    if(quality==='high'){
      await button('恢复珊瑚晚霞初始状态').click()
      await page.getByLabel('车速',{exact:true}).focus()
      await page.keyboard.press('End')
      const distance=()=>page.locator('.distance').evaluate(el=>parseFloat(el.textContent))
      for(const [i,label] of ['远景','环绕','车外跟随','电影巡航'].entries()){
        await button(label).click()
        if(i===1){await page.mouse.move(500,350);await page.mouse.wheel(0,2400)}
        const d=await distance()
        const next=(Math.floor(d/25)+2)*25
        await page.waitForFunction(v=>parseFloat(document.querySelector('.distance').textContent)>=v,next-3)
        await save('cross-'+i+'-a',await capture('a'))
        await page.waitForFunction(v=>parseFloat(document.querySelector('.distance').textContent)>=v,next+2)
        await save('cross-'+i+'-b',await capture('b'))
      }
      await button('暂停列车').click()
      const paused=await distance()
      await page.waitForTimeout(350)
      assert.equal(await distance(),paused)
      await button('继续运行').click()
      await page.waitForTimeout(600)
      assert.ok(await distance()>paused)
      // Exercise the application's Page Visibility handler independently of the host window manager.
      await page.evaluate(()=>{
        Object.defineProperty(document,'hidden',{configurable:true,value:true})
        document.dispatchEvent(new Event('visibilitychange'))
      })
      const freezeDistance=await distance()
      await page.waitForTimeout(700)
      assert.equal(await distance(),freezeDistance)
      await page.evaluate(()=>{
        delete document.hidden
        document.dispatchEvent(new Event('visibilitychange'))
      })
      await page.waitForTimeout(500)
      assert.ok(await distance()>freezeDistance)
      await page.getByLabel('车速',{exact:true}).focus()
      await page.keyboard.press('Home')
      const stopped=await distance()
      await page.waitForTimeout(500)
      assert.equal(await distance(),stopped)
      await button('回到起点').click()
      await page.waitForTimeout(100)
      assert.equal(await distance(),0)
    }
    if(quality==='low'){
      await page.setViewportSize({width:390,height:844})
      await page.getByRole('button',{name:'场景控制',exact:true}).click()
      await page.getByText('自定义配色',{exact:true}).click()
      await page.locator('.region-row').nth(4).click()
      await page.getByText('256 色色板',{exact:true}).click()
      await grid.nth(100).click()
      assert.ok((await saved()).orangeGlow.skyBand)
      await page.screenshot({path:dir+'/mobile-editor.jpg'})
    }
    await context.close()
  }
  assert.deepEqual(errors,[])
  await writeFile(dir+'/visual-checks.json',JSON.stringify({browser:browser.version(),pixelsPerFrame:640*360,results,errors,checks:['256-keyboard','hex-persistence','per-preset-reset','four-camera-crossings','pause-resume','zero-speed','simulated-page-visibility','mobile-editor']},null,2))
}finally{await browser?.close();await new Promise(resolve=>server.httpServer.close(resolve))}
