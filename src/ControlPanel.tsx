import {useEffect,useRef,type ReactNode} from 'react'
import {CloudControls,SceneSlider,Slider} from './CloudControls'
import {TransportControls} from './TransportControls'
import {scenePresets,presetIds} from './config/scenePresets'
import {factoryReset,resetPreset,selectPreset,useScene} from './scene/store'
export function ControlPanel({children}:{children:ReactNode}){
  const s=useScene()
  const toggleRef=useRef<HTMLButtonElement>(null)
  const closeRef=useRef<HTMLButtonElement>(null)
  const showRef=useRef<HTMLButtonElement>(null)
  useEffect(()=>{
    const media=matchMedia('(max-width: 760px)')
    const resize=()=>useScene.setState({panelOpen:!media.matches})
    media.addEventListener('change',resize)
    return ()=>media.removeEventListener('change',resize)
  },[])
  function close(){useScene.setState({panelOpen:false});requestAnimationFrame(()=>toggleRef.current?.focus())}
  function open(){useScene.setState({panelOpen:true,uiHidden:false});requestAnimationFrame(()=>closeRef.current?.focus())}
  return <>
    {s.uiHidden?<button className="panel-toggle" ref={showRef} onClick={open}>显示界面</button>:
      !s.panelOpen&&<button className="panel-toggle" ref={toggleRef} aria-expanded="false" aria-controls="settings" onClick={open}>场景控制</button>}
    <aside className="panel" id="settings" aria-label="场景控制" hidden={s.uiHidden||!s.panelOpen}
      onKeyDown={e=>{if(e.key==='Escape')close()}}>
      <header className="panel-head"><h2>场景控制</h2><button ref={closeRef} className="close" onClick={close} aria-label="收起面板">⌄</button></header>
      <div className="panel-scroll">
        <section className="group"><h3>视觉预设 <small>PALETTE</small></h3><div className="presets">
          {presetIds.map(id=>{const p=scenePresets[id];return <button key={id} aria-pressed={s.visualPreset===id} onClick={()=>selectPreset(id)}>
            <i aria-hidden="true" style={{background:`linear-gradient(163deg,${p.sky},${p.horizon} 51%,${p.cloud} 54%,${p.shadow})`}}/>{p.name}</button>})}
        </div></section>
        <TransportControls/>
        <section className="group"><h3>光影 <small>ATMOSPHERE</small></h3><div className="group-body">
          <SceneSlider setting="sunIntensity"/><Slider label="饱和度" value={s.saturation} min={.5} max={1.6} step={.01} onChange={v=>useScene.setState({saturation:v})}/>
          <SceneSlider setting="fogStrength"/>
        </div></section>
        <CloudControls/>
        <details className="group"><summary>显示与声音 <small>DISPLAY</small></summary><div className="group-body">
          <label className="field">天空来源<select aria-label="天空来源" disabled value={s.skySource}><option value="gradient">渐变天空</option><option disabled>全景背景</option></select></label>
          <p className="note">全景素材含固定云层，当前使用程序化天空。</p>
          <label><input type="checkbox" checked={s.reducedMotion} onChange={e=>useScene.setState({reducedMotion:e.target.checked})}/>减少动效</label>
          <label><input type="checkbox" disabled/>景深 <small>尚未接入后处理</small></label>
          <label><input type="checkbox" disabled/>音效 <small>暂无音频素材</small></label>
        </div></details>
        {children}
        <div className="resets"><button onClick={resetPreset}>重置当前预设</button><button onClick={factoryReset}>恢复珊瑚晚霞初始状态</button></div>
      </div>
      <button className="hide-ui" onClick={()=>{useScene.setState({uiHidden:true});requestAnimationFrame(()=>showRef.current?.focus())}}>隐藏界面</button>
    </aside>
  </>
}
