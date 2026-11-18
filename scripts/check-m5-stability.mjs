import {preview} from 'vite'
import {writeFile,mkdir} from 'node:fs/promises'
import {pathToFileURL} from 'node:url'
import assert from 'node:assert/strict'
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright')
const dir='docs/verification/m5'
await mkdir(dir,{recursive:true})
const server=await preview({preview:{host:'127.0.0.1',port:5256,strictPort:true}})
let browser
try{
 browser=await chromium.launch({executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader']})
 const page=await browser.newPage({viewport:{width:1280,height:800}})
 const errors=[],models=[],cycles=[],resizes=[]
 page.on('pageerror',e=>errors.push(String(e)))
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
 page.on('response',r=>{if(r.url().endsWith('.glb'))models.push(r.status())})
 await page.addInitScript(()=>{
   window.liveBuffers=0
   const proto=WebGL2RenderingContext.prototype,create=proto.createBuffer,del=proto.deleteBuffer
   const buffers=new WeakSet()
   proto.createBuffer=function(){const b=create.call(this);if(b){buffers.add(b);window.liveBuffers++}return b}
   proto.deleteBuffer=function(b){if(b && buffers.delete(b))window.liveBuffers--;return del.call(this,b)}
   window.losses=0
   document.addEventListener('webglcontextlost',()=>window.losses++,true)
   window.__THREE_DEVTOOLS__=new EventTarget()
   window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{
     const r=e.detail
     if(!r.isWebGLRenderer)return
     window.renderer=r
     const native=r.render.bind(r)
     r.render=(scene,camera)=>{window.camera=camera;native(scene,camera)
       if(window.stressFrameDelay){const end=performance.now()+40;while(performance.now()<end){/* QA-only load */}}}
   })
 })
 const button=name=>page.getByRole('button',{name,exact:true})
 const wait=ms=>page.waitForTimeout(ms)
 const info=()=>page.evaluate(()=>{
   const r=window.renderer, p=window.camera
   return {geometries:r.info.memory.geometries,textures:r.info.memory.textures,programs:r.info.programs.length,
     buffers:window.liveBuffers,frames:r.info.render.frame,contextLost:r.getContext().isContextLost(),losses:window.losses,
     buffer:[r.domElement.width,r.domElement.height],dpr:r.getPixelRatio(),eye:p.position.toArray(),rotation:p.quaternion.toArray(),fov:p.fov,aspect:p.aspect,progress:document.querySelector('.distance').textContent}
 })
 const stableResources=s=>[s.geometries,s.textures,s.programs,s.buffers]
 await page.goto('http://127.0.0.1:5256/')
 await page.waitForFunction(()=>window.camera&&document.querySelector('output')?.textContent==='')
 await button('回到起点').click()
 const clouds=page.locator('.clouds-panel')
 await clouds.locator('summary').click()
 const quality=clouds.locator('select')
 const animation=page.getByLabel('云海动画',{exact:true})
 await animation.uncheck()
 // Warm up every shader variant before comparing equivalent settled scenes.
 for(let i=0;i<12;i++){
   await quality.selectOption('low')
   await button('橘色暮光').click()
   assert.equal((await info()).dpr,.9)
   await button('紫夜航线').click()
   await quality.selectOption('high')
   await button('珊瑚晚霞').click()
   await wait(1100)
   const s=await info()
   cycles.push(s)
   assert(s.eye.every(Number.isFinite));assert(!s.contextLost)
 }
 for(const s of cycles.slice(2)){
   assert.deepEqual(stableResources(s),stableResources(cycles[1]))
   assert(Math.hypot(...s.eye.map((v,i)=>v-cycles[1].eye[i]))<.01)
 }
 for(const [width,height] of [[1920,1080],[760,720],[390,844],[844,390],[1280,800]]){
   await page.setViewportSize({width,height});await wait(1500)
   const s=await info()
   assert(Math.abs(s.aspect-width/height)<.002)
   assert(Math.abs(s.buffer[0]-width*s.dpr)<2)
   assert(Math.abs(s.buffer[1]-height*s.dpr)<2)
   assert(s.eye.every(Number.isFinite));assert.equal(s.losses,0)
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
   resizes.push({width,height,...s})
 }
 if(await button('场景控制').isVisible())await button('场景控制').click()
 if(!await clouds.evaluate(el=>el.open))await clouds.locator('summary').click()
 await button('远景').click()
 const progress=()=>page.locator('.distance').innerText()
 const playChecks=[]
 for(let i=0;i<5;i++){
   await button('继续运行').click()
   const initial=await progress()
   await page.waitForFunction(v=>document.querySelector('.distance').textContent!==v,initial)
   await button('暂停列车').click()
   await wait(150)
   const stopped=await progress()
   await animation.check();const start=await info();await wait(350);const end=await info()
   assert.equal(await progress(),stopped);assert(end.frames>start.frames)
   await animation.uncheck();await wait(2400)
   const a=await info();await wait(350);const b=await info()
   assert.equal(a.frames,b.frames)
   playChecks.push({stopped,cloudOnlyFrames:end.frames-start.frames,idleFrames:b.frames-a.frames})
 }
 await button('回到起点').click()
 await button('车外跟随').click()
 await wait(2200)
 await clouds.locator('summary').click()
 await button('隐藏界面').click()
 await wait(1200)
 await page.screenshot({path:dir+'/follow.jpg',type:'jpeg',quality:92})
 assert.deepEqual(models,[200,200,200]);assert.deepEqual(errors,[])
 const final=await info()
 assert.equal(final.losses,0)
 // Separate synthetic load test. These frames are excluded from the performance benchmarks.
 await button('显示界面').click()
 if(!await clouds.evaluate(el=>el.open))await clouds.locator('summary').click()
 await animation.check()
 const ceiling=(await info()).dpr
 await page.evaluate(()=>{window.stressFrameDelay=true})
 await page.waitForFunction(v=>window.renderer.getPixelRatio()<v,ceiling,{timeout:20000})
 const lowered=(await info()).dpr
 await page.evaluate(()=>{window.stressFrameDelay=false})
 await page.waitForFunction(v=>window.renderer.getPixelRatio()===v,ceiling,{timeout:25000})
 const adaptive={ceiling,lowered,recovered:(await info()).dpr}
 const result={adaptive,browser:browser.version(),cycles,resizes,playChecks,models,errors,contextLosses:final.losses}
 await writeFile(dir+'/stability.json',JSON.stringify(result,null,2))
 console.log(JSON.stringify({cycles:cycles.length,resources:stableResources(cycles.at(-1)),resizeCount:resizes.length,playChecks,models,errors}))
}finally{await browser?.close();await new Promise(done=>server.httpServer.close(done))}
