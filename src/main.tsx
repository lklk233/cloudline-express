import { lazy, Suspense, useCallback, useState, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import {useScene as useView, type Inspection} from './scene/store'
import {ControlPanel} from './ControlPanel'
import {scenePresets} from './config/scenePresets'
import { ErrorBoundary, type ModelKind, type ModelStatus } from './scene/Model'
import {shots} from './TransportControls'
import {renderBudget} from './scene/renderBudget'
import { World } from './scene/World'
import './style.css'

const AssetPreview = lazy(() => import('./AssetPreview').then(module => ({default:module.AssetPreview})))
const labels = { locomotive:'车头', carriage:'车厢', bridge:'桥梁' } as const
const kinds = Object.keys(labels) as ModelKind[]
function ScenePage() {
  const view = useView()
  const [dpr,setDpr]=useState(()=>renderBudget(view.cloudQuality,innerWidth<=760,devicePixelRatio).max)
  const readout=useRef<HTMLSpanElement>(null)
  const onProgress=useCallback((fraction:number)=>{if(readout.current)readout.current.textContent=Number((fraction*100).toFixed(1))+"%"},[])
  const [status, setStatus] = useState<Record<ModelKind,ModelStatus>>({locomotive:'加载中',carriage:'加载中',bridge:'加载中'})
  const report = useCallback((kind: ModelKind, value: ModelStatus) =>
    setStatus(previous => previous[kind] === value ? previous : {...previous,[kind]:value}), [])
  const message = kinds.filter(kind => status[kind] !== '就绪').map(kind => labels[kind] + status[kind]).join(' · ')
  const fallback = <p className="error" role="alert">三维画面无法启动。<a href="?view=assets">查看素材参考图</a></p>
  return <main className="scene-page">
    <div className="viewport" style={{filter:`saturate(${view.saturation})`}}><ErrorBoundary fallback={fallback}>
      <Canvas frameloop="demand" dpr={dpr} camera={{near:.15,far:1200}} fallback={fallback} gl={{antialias:true,alpha:false}}>
        <World onDpr={setDpr} visible={view.visible} debug={view.debug} ready={kinds.every(k=>status[k]!=='加载中')} onProgress={onProgress} report={report}/>
      </Canvas>
    </ErrorBoundary></div>
    <header className="mast" hidden={view.uiHidden}><div>CLOUDLINE EXPRESS</div><h1>云间列车</h1></header>
    <footer className="scene-footer" hidden={view.uiHidden}><div className="caption">
      <span>{scenePresets[view.visualPreset].name}</span>
      <small>{view.inspection==='rail'?'轮轨校准':view.inspection==='cloud'?'云团侧视':shots[view.shot]} · <span className="distance" ref={readout}>0%</span></small>
    </div></footer>
    <ControlPanel>
    {import.meta.env.DEV && <details className="group inspector"><summary>场景校准</summary><div className="group-body">
      <label>观察位置<select aria-label="观察位置" value={view.inspection ?? ""} onChange={e=>useView.setState({inspection:(e.target.value || null) as Inspection})}>
        <option value="">当前镜头</option><option value="cloud">侧看云团</option><option value="rail">轮轨近景</option>
      </select></label>
      <label><input type="checkbox" checked={view.debug} onChange={e=>useView.setState({debug:e.target.checked})}/>坐标轴与包围盒</label>
      {kinds.map(kind=><label key={kind}><input type="checkbox" checked={view.visible[kind]} onChange={e=>useView.setState({visible:{...view.visible,[kind]:e.target.checked}})}/>{labels[kind]}</label>)}
      <a href="?view=assets">素材参考图</a></div></details>}</ControlPanel>
    <output aria-live="polite">{message}</output>
  </main>
}

createRoot(document.getElementById('root')!).render(new URLSearchParams(location.search).get('view') === 'assets'
  ? <div className="asset-page"><Suspense fallback="读取参考图…"><AssetPreview/></Suspense></div> : <ScenePage/>)


