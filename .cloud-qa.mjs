import {preview} from 'vite'
import {chromium} from 'file:///C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
import {mkdir} from 'node:fs/promises'
const server=await preview({preview:{port:0,host:'127.0.0.1'}})
let browser
try {
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--enable-unsafe-swiftshader']})
 const page=await browser.newPage({viewport:{width:1100,height:700}})
 page.on('pageerror',console.error)
 page.on('console',m=>{if(m.type()==='error')console.error(m.text())})
 const base='http://127.0.0.1:'+server.httpServer.address().port
 await page.goto(base)
 await page.waitForFunction(()=>document.querySelector('output')?.textContent==='')
 await page.waitForTimeout(1000)
 await page.locator('.clouds-panel summary').click()
 await page.getByLabel('云海动画',{exact:true}).uncheck()
 const dir='docs/verification/volume-clouds'
 await mkdir(dir,{recursive:true})
 await page.addStyleTag({content:'header,footer,aside,.panel-toggle,output{visibility:hidden!important}'})
 await page.locator('canvas').screenshot({path:dir+'/scenic.jpg'})
 await page.locator('nav.shots button').nth(2).evaluate(el=>el.click())
 await page.waitForTimeout(1800)
 await page.locator('canvas').screenshot({path:dir+'/follow.jpg'})
 await page.locator('.clouds-panel select').evaluate(el=>{el.value='low';el.dispatchEvent(new Event('change',{bubbles:true}))})
 await page.waitForTimeout(1200)
} finally {await browser?.close();await server.close()}

