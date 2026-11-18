import {useEffect,type RefObject} from 'react'
import {useScene,resetTrain,type CameraMode} from './scene/store'
import {Slider} from './CloudControls'
export const shots:Record<CameraMode,string>={scenic:'远景',orbit:'环绕',follow:'车外跟随',cinematic:'电影巡航'}
export function TransportControls({distanceRef}:{distanceRef:RefObject<HTMLSpanElement|null>}){
  const {shot,inspection,trainRunning,trainSpeed}=useScene()
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)')
    const update=()=>useScene.setState({reducedMotion:media.matches})
    media.addEventListener('change',update)
    return ()=>media.removeEventListener('change',update)
  },[])
  return <section className="group"><h3>旅行 <small>JOURNEY</small></h3>
    <nav className="shots" aria-label="外部镜头">{(Object.keys(shots) as CameraMode[]).map(key=>
      <button key={key} aria-pressed={key===shot&&!inspection} onClick={()=>useScene.setState({shot:key,inspection:null})}>{shots[key]}</button>)}</nav>
    {shot==='orbit'&&!inspection&&<p className="note">拖动环绕 · 滚轮或双指缩放</p>}
    <p className="trip-status"><span>{!trainRunning?'已暂停':trainSpeed===0?'车速为零':'行驶中'}</span><span>本次里程 <b ref={distanceRef}>0.0 单位</b></span></p>
    <Slider label="车速" value={trainSpeed} min={0} max={12} step={.5} unit=" 单位/秒" onChange={v=>useScene.setState({trainSpeed:v})}/>
    <div className="actions"><button onClick={()=>useScene.setState({trainRunning:!trainRunning})}>{trainRunning?'暂停列车':'继续运行'}</button>
    <button onClick={resetTrain}>回到起点</button></div>
  </section>
}
