import {bounds,type NumericKey} from './scene/clouds/layout'
import {setNumber,useScene} from './scene/store'
const labels:Record<NumericKey,string>={
 cloudSpeed:'云速',cloudDensity:'云量',cloudLayerCount:'远景层数',lowerCloudHeight:'桥下云层高度',cloudScale:'云团大小',lowerCloudScale:'桥下云层大小',
 cloudHeight:'云海高度',windDirection:'风向',mistSpeed:'薄雾速度',cloudShadowStrength:'云影',
 cloudEdgeSoftness:'边缘柔和度',fogStrength:'雾强',sunIntensity:'日照',
}
type SliderProps={label:string,value:number,min:number,max:number,step:number,unit?:string,onChange:(v:number)=>void}
export function Slider({label,value,min,max,step,unit='',onChange}:SliderProps){
  const fill=(value-min)/(max-min)*100
  return <label className="slider"><span>{label}</span><b>{value}{unit}</b>
    <input aria-label={label} type="range" min={min} max={max} step={step} value={value}
      style={{background:`linear-gradient(to right,var(--gold) ${fill}%,#71566b ${fill}%)`}}
      onChange={e=>onChange(e.currentTarget.valueAsNumber)}/></label>
}
export function SceneSlider({setting}:{setting:NumericKey}){
  const value=useScene(s=>s[setting])
  const [min,max,step]=bounds[setting]
  const units:Partial<Record<NumericKey,string>>={windDirection:'°',cloudScale:'×',lowerCloudScale:'×',cloudLayerCount:' 层',lowerCloudHeight:' 单位',cloudHeight:' 单位'}
  return <Slider label={labels[setting]} {...{value,min,max,step}} unit={units[setting]} onChange={v=>setNumber(setting,v)}/>
}
export function CloudControls(){
  const s=useScene()
  return <details className="group clouds-panel"><summary>云海 <small>CLOUDS</small></summary><div className="group-body">
    <div className="checks"><label><input type="checkbox" checked={s.cloudsVisible} onChange={e=>useScene.setState({cloudsVisible:e.target.checked})}/>显示云海</label>
    <label><input type="checkbox" checked={s.cloudAnimationRunning} onChange={e=>useScene.setState({cloudAnimationRunning:e.target.checked})}/>云海动画</label></div>
    {(Object.keys(bounds) as NumericKey[]).filter(k=>k!=='fogStrength'&&k!=='sunIntensity').map(k=><SceneSlider key={k} setting={k}/>)}
    <label className="field">质量<select value={s.cloudQuality} onChange={e=>useScene.setState({cloudQuality:e.target.value==='low'?'low':'high'})}><option value="high">高</option><option value="low">低</option></select></label>
    <label className="field">布局种子<input key={s.cloudSeed} type="number" defaultValue={s.cloudSeed} step="1" onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur()}} onBlur={e=>{
      const seed=e.target.valueAsNumber
      if(Number.isSafeInteger(seed))useScene.setState({cloudSeed:seed});else e.target.value=String(s.cloudSeed)
    }}/></label>
  </div></details>
}

