import {preview} from 'vite'
import {spawn} from 'node:child_process'
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {setTimeout as delay} from 'node:timers/promises'
import assert from 'node:assert/strict'

const historyTest=process.argv.includes('--history')
const server=await preview({preview:{host:'127.0.0.1',port:0}})
const url='http://127.0.0.1:'+server.httpServer.address().port
const profile=await mkdtemp(path.join(tmpdir(),'cloudline-visibility-'))
const browser=spawn(process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ['--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check',
  '--headless=new','about:blank'],{windowsHide:true,stdio:'ignore'})
let socket,send
try{
  let endpoint
  for(let i=0;i<100&&!endpoint;i++){
    try{const [port,route]=(await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).trim().split(/\r?\n/)
      if(route)endpoint='ws://127.0.0.1:'+port+route}catch{}
    if(!endpoint)await delay(150)
  }
  assert.ok(endpoint,'Missing browser debugging endpoint')
  socket=new WebSocket(endpoint)
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject})
  let id=0
  const pending=new Map()
  socket.onmessage=e=>{
    const m=JSON.parse(e.data)
    if(!pending.has(m.id))return
    const [resolve,reject]=pending.get(m.id)
    pending.delete(m.id)
    if(m.error)reject(Error(m.error.message));else resolve(m.result)
  }
  send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{
    pending.set(++id,[resolve,reject]);socket.send(JSON.stringify({id,method,params,sessionId}))
  })
  const target=await send('Target.createTarget',{url})
  let {sessionId}=await send('Target.attachToTarget',{...target,flatten:true})
  const evaluate=async expression=>(await send('Runtime.evaluate',{expression,returnByValue:true},sessionId)).result.value
  const state=()=>evaluate("({visibility:document.visibilityState,distance:parseFloat(document.querySelector('.distance')?.textContent)})")
  await send('Target.activateTarget',target)
  let before
  for(let i=0;i<120;i++){before=await state();if(before?.distance>2)break;await delay(150)}
  assert.ok(before.distance>2)
  await evaluate(`window.visibilityLog=[];document.addEventListener('visibilitychange',()=>{
    window.visibilityLog.push({visibility:document.visibilityState,distance:parseFloat(document.querySelector('.distance').textContent)})
  })`)
  if(historyTest){
    // Navigate away and return through session history. Both events come from the browser.
    await send('Page.navigate',{url:url+'/?view=assets'},sessionId)
    await delay(1800)
    const history=await send('Page.getNavigationHistory',{},sessionId)
    await send('Page.navigateToHistoryEntry',{entryId:history.entries[history.currentIndex-1].id},sessionId)
    await delay(1500)
  }else{
    await send('Target.detachFromTarget',{sessionId})
    const other=await send('Target.createTarget',{url:'data:text/html,<body style="background:navy;color:white">Second test tab</body>',newWindow:false})
    await send('Target.activateTarget',other)
    await delay(3000)
    await send('Target.activateTarget',target)
    await delay(1500)
    ;({sessionId}=await send('Target.attachToTarget',{...target,flatten:true}))
  }
  const log=await evaluate('window.visibilityLog')
  console.log(log)
  const hidden=log[0],held=log[1]
  const resumed=await state()
  console.log({before,hidden,held,resumed})
  assert.equal(hidden.visibility,'hidden');assert.equal(held.distance,hidden.distance)
  assert.equal(resumed.visibility,'visible');assert.ok(resumed.distance>held.distance)
  await writeFile('docs/verification/v2/'+(historyTest?'history':'tab')+'-visibility.json',JSON.stringify({before,hidden,held,resumed},null,2))
}finally{
  if(send)await send('Browser.close').catch(()=>{})
  socket?.close()
  if(browser.exitCode===null)await Promise.race([new Promise(r=>browser.once('exit',r)),delay(3000)])
  if(browser.exitCode===null)browser.kill()
  await new Promise(resolve=>server.httpServer.close(resolve))
  await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:300})
}
