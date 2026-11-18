import {preview} from 'vite'
import {mkdir,writeFile} from 'node:fs/promises'
import {pathToFileURL} from 'node:url'
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright')
if(!process.env.BASELINE_ROOT)throw Error('Set BASELINE_ROOT to the built v1.0 checkout')
const out='docs/verification/v2'
await mkdir(out,{recursive:true})
const browser=await chromium.launch({executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'})
try{
  for(const version of ['before','after']){
    const server=await preview({root:version==='before'?process.env.BASELINE_ROOT:process.cwd(),preview:{host:'127.0.0.1',port:0}})
    try{
      const page=await browser.newPage({viewport:{width:1280,height:720}})
      page.on('pageerror',e=>console.error(e))
      page.on('console',m=>{if(m.type()==='error')console.error(m.text())})
      page.on('response',r=>{if(r.status()>=400)console.error(r.status(),r.url())})
      await page.addInitScript(()=>{
        localStorage.setItem('cloudline-express-settings',JSON.stringify({version:4,state:{trainSpeed:0,cloudAnimationRunning:false}}))
        window.__THREE_DEVTOOLS__=new EventTarget()
        window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{
          const r=e.detail
          if(!r.isWebGLRenderer)return
          const original=r.render.bind(r)
          r.render=(scene,camera)=>{
            window.capturePreset=()=>{original(scene,camera);return r.domElement.toDataURL('image/png')}
            original(scene,camera)
          }
        })
      })
      await page.goto('http://127.0.0.1:'+server.httpServer.address().port)
      await page.waitForFunction(()=>window.capturePreset && document.querySelector('output')?.textContent==='').catch(async err=>{console.log(await page.locator('body').innerText());throw err})
      for(const [i,id] of ['coral','orange','violet'].entries()){
        await page.locator('.presets button').nth(i).click()
        await page.waitForTimeout(1500)
        const data=await page.evaluate(()=>window.capturePreset())
        await writeFile(out+'/preset-'+version+'-'+id+'.png',Buffer.from(data.split(',')[1],'base64'))
      }
      await page.close()
    }finally{await new Promise(resolve=>server.httpServer.close(resolve))}
  }
}finally{await browser.close()}
