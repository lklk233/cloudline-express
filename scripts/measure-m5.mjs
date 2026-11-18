// Run against an existing production build. Set PLAYWRIGHT_MODULE and EDGE_PATH if needed.
import {preview} from 'vite'
import {mkdir,writeFile} from 'node:fs/promises'
import os from 'node:os'
import {pathToFileURL} from 'node:url'
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright')
const phase=process.argv[2]||'after'
if(!['before','after'].includes(phase))throw Error('Expected before or after')
const out='docs/verification/m5'
await mkdir(out,{recursive:true})
const server=await preview({preview:{host:'127.0.0.1',port:5255,strictPort:true}})
let browser
try{
 browser=await chromium.launch({executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader']})
 const results={phase,browser:browser.version(),platform:os.platform()+' '+os.release(),cpu:os.cpus()[0].model,samples:[]}
 for(const [profile,width,height,dpr,quality] of [['desktop-high',1920,1080,1,'high'],['desktop-low',1920,1080,1,'low'],['mobile-low',390,844,3,'low']]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:dpr,isMobile:profile==='mobile-low',hasTouch:profile==='mobile-low'})
   const errors=[]
   page.on('pageerror',e=>errors.push(String(e)))
   page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
   await page.addInitScript(({quality})=>{
     localStorage.setItem('cloudline-express-settings',JSON.stringify({version:4,state:{cloudQuality:quality}}))
     window.__THREE_DEVTOOLS__=new EventTarget()
     window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{
       const r=e.detail
       if(!r.isWebGLRenderer)return
       window.probe={r,frames:[]}
       const render=r.render.bind(r)
       r.render=(...args)=>{render(...args);window.probe.frames.push(performance.now())}
     })
   },{quality})
   await page.goto('http://127.0.0.1:5255/')
   await page.waitForFunction(()=>window.probe?.frames.length>=3 && document.querySelector('output')?.textContent==='',null,{timeout:120000})
   await page.waitForTimeout(6000)
   await page.evaluate(()=>window.probe.frames.length=0)
   await page.waitForTimeout(12000)
   const sample=await page.evaluate(()=>{
     const {r,frames}=window.probe,gl=r.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info')
     const intervals=frames.slice(1).map((t,i)=>t-frames[i]).sort((a,b)=>a-b)
     if(!intervals.length)throw Error('No scene frames')
     const elapsed=frames.at(-1)-frames[0]
     return {renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),buffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],renderDpr:r.getPixelRatio(),frames:frames.length,elapsedMs:Math.round(elapsed),fps:+(intervals.length*1000/elapsed).toFixed(2),p95ms:+intervals[Math.ceil(intervals.length*.95)-1].toFixed(1),triangles:r.info.render.triangles,drawCalls:r.info.render.calls,progress:document.querySelector('.distance').textContent}
   })
   results.samples.push({profile,width,height,dpr,quality,...sample,errors})
   console.log(profile,JSON.stringify(sample))
   await page.screenshot({path:out+'/'+phase+'-'+profile+'.jpg',type:'jpeg',quality:83,scale:'css'})
   await page.close()
   await writeFile(out+'/'+phase+'.json',JSON.stringify(results,null,2))
   if(errors.length)throw Error(errors.join('\n'))
 }
}finally{await browser?.close();await new Promise(done=>server.httpServer.close(done))}
