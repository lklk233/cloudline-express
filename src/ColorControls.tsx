import {useState} from 'react'
import {defaultPaint,regions,regionIds,swatches,validHex,type Region,type Paint} from './config/regionColors'
import {useScene,editRegion} from './scene/store'

function preview(p:Paint){
  return p.mode==='solid'?p.start:`linear-gradient(to right,${p.start},${p.end})`
}
function Endpoint({value,onChange}:{value:string;onChange:(color:string)=>void}){
  const [draft,setDraft]=useState<string|null>(null)
  return <><div className="color-entry"><input type="color" aria-label="取色器" value={value} onChange={e=>onChange(e.target.value.toUpperCase())}/>
    <input aria-label="HEX 色值" spellCheck={false} maxLength={7} value={draft??value} onBlur={()=>setDraft(null)}
      onChange={e=>{const v=e.target.value;setDraft(v);if(validHex(v))onChange(v.toUpperCase())}}/></div>
    <details><summary>256 色色板</summary><div className="color-grid">{swatches.map(color=><button key={color} title={color}
      aria-label={color} aria-pressed={color===value} style={{backgroundColor:color}} onClick={()=>onChange(color)}/>)}</div></details></>
}
function Editor({region,paint}:{region:Region;paint:Paint}){
  const [endpoint,setEndpoint]=useState<'start'|'end'>('start')
  const key=paint.mode==='solid'?'start':endpoint
  const update=(next:Partial<Paint>)=>editRegion(region,{...paint,...next})
  return <div className="paint-editor"><div className="actions">{(['solid','gradient'] as const).map(mode=>
    <button key={mode} aria-pressed={paint.mode===mode} onClick={()=>{if(mode!==paint.mode){setEndpoint('start');update({mode,end:paint.start})}}}>{mode==='solid'?'单色':'双色渐变'}</button>)}</div>
    {paint.mode==='gradient'&&<div className="color-tools">{(['start','end'] as const).map(k=><button key={k} aria-pressed={key===k} onClick={()=>setEndpoint(k)}>{k==='start'?'起色':'终色'}</button>)}
      <button onClick={()=>update({start:paint.end,end:paint.start})}>交换</button></div>}
    <Endpoint key={key} value={paint[key]} onChange={v=>update({[key]:v})}/>
    <button onClick={()=>editRegion(region)}>还原本区配色</button></div>
}
export function ColorControls(){
  const id=useScene(s=>s.visualPreset),entries=useScene(s=>s.overrides[id])
  const [active,setActive]=useState<Region|null>(null)
  return <details className="custom-colors"><summary>自定义配色</summary>{regionIds.map(region=>{
    const paint=entries?.[region]??defaultPaint(id,region)
    return <div key={region}><button className="region-row" aria-expanded={region===active} onClick={()=>setActive(active===region?null:region)}>
      <span>{regions[region]}{region==='vista'&&<small> · 地平线与远雾</small>}</span><i style={{background:preview(paint)}}/></button>
      {active===region&&<Editor key={id+region} region={region} paint={paint}/>}</div>
  })}</details>
}
