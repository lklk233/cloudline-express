import {preview} from 'vite'
import {mkdir,writeFile} from 'node:fs/promises'
import {pathToFileURL} from 'node:url'
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright')
const out='docs/verification/v2'
await mkdir(out,{recursive:true})
const server=await preview({preview:{host:'127.0.0.1',port:0}})
let browser
try{
  browser=await chromium.launch({executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'})
  const page=await browser.newPage({viewport:{width:1280,height:720}})
  const errors=[]
  page.on('pageerror',e=>errors.push(String(e)))
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
  await page.addInitScript(()=>{
    localStorage.setItem('cloudline-express-settings',JSON.stringify({version:4,state:{trainSpeed:12}}))
    window.__THREE_DEVTOOLS__=new EventTarget()
    window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{
      const r=e.detail
      if(!r.isWebGLRenderer)return
      const render=r.render.bind(r)
      r.render=(scene,camera)=>{window.probe={r,scene};render(scene,camera)}
    })
  })
  await page.goto('http://127.0.0.1:'+server.httpServer.address().port)
  await page.waitForFunction(()=>parseFloat(document.querySelector('.distance')?.textContent)>20)
  const samples=[]
  const started=Date.now()
  for(let i=0;i<=30;i++){
    if(i)await page.waitForTimeout(Math.max(0,started+i*60000-Date.now()))
    const sample=await page.evaluate(()=>{
      const {r,scene}=window.probe
      const mats=new Set()
      let bridges=0
      scene.traverse(n=>{
        if(n.material)mats.add(n.material.uuid)
        if(n.name==="bridge-span")bridges++
      })
      return {distance:parseFloat(document.querySelector('.distance').textContent),hidden:document.hidden,
        materials:mats.size,bridgeSpans:bridges,...r.info.memory,programs:r.info.programs.length}
    })
    samples.push({seconds:(Date.now()-started)/1000,...sample})
    await writeFile(out+'/cruise-30min.json',JSON.stringify({browser:browser.version(),viewport:[1280,720],speed:12,samples,errors},null,2))
    if(sample.bridgeSpans!==49 || sample.hidden || (i && sample.distance<=samples[i-1].distance) || errors.length)throw Error('Long-run check failed')
  }
}finally{await browser?.close();await new Promise(resolve=>server.httpServer.close(resolve))}
