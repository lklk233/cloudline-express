import {createContext,useContext,useLayoutEffect,useMemo,useRef,type ReactNode} from 'react'
import {useFrame,useThree} from '@react-three/fiber'
import {Color,DirectionalLight,HemisphereLight} from 'three'
import {scenePresets,type PresetId} from '../config/scenePresets'
import {useScene} from './store'
import {defaultPaint,regionIds,type Overrides} from '../config/regionColors'
export const paletteGLSL='uniform vec3 sky, horizon, sunlight, cloud, shadowColor, rim, mist;'+regionIds.map(r=>
  `uniform vec3 ${r}A,${r}B,${r}Weight;vec3 paint_${r}(vec3 original,float t,float light){return mix(original,mix(${r}A,${r}B,clamp(t,0.,1.))*light,${r}Weight.r);}`).join('\n')
function colors(id:PresetId,overrides:Overrides={}){
  const p=scenePresets[id]
  const result:Record<string,{value:Color}>={sky:{value:new Color(p.sky)},horizon:{value:new Color(p.horizon)},sunlight:{value:new Color(p.sunlight)},
    cloud:{value:new Color(p.cloud)},shadowColor:{value:new Color(p.shadow)},rim:{value:new Color(p.rim)},mist:{value:new Color(p.mist)}}
  for(const region of regionIds){
    const custom=overrides[id]?.[region]
    const p=custom??defaultPaint(id,region)
    result[region+'A']={value:new Color(p.start)}
    result[region+'B']={value:new Color(p.mode==='solid'?p.start:p.end)}
    result[region+'Weight']={value:new Color().setScalar(custom?1:0)}
  }
  return result
}
type Palette=ReturnType<typeof colors>
const Context=createContext<Palette|null>(null)
export function usePalette(){return useContext(Context)!}
const keys=Object.keys(colors('coralSunset')) as (keyof Palette)[]
export function PaletteProvider({children}:{children:ReactNode}){
  const id=useScene(s=>s.visualPreset)
  const overrides=useScene(s=>s.overrides)
  const previous=useRef(id)
  const invalidate=useThree(s=>s.invalidate)
  const current=useMemo(()=>colors(useScene.getState().visualPreset,useScene.getState().overrides),[])
  const target=useMemo(()=>colors(id,overrides),[id,overrides])
  const start=useMemo(()=>colors(useScene.getState().visualPreset,useScene.getState().overrides),[])
  const since=useRef(0)
  useLayoutEffect(()=>{
    for(const key of keys)start[key].value.copy(current[key].value)
    since.current=previous.current===id ? -Infinity : performance.now()
    previous.current=id
    invalidate()
  },[start,target,current,invalidate,id])
  useFrame(()=>{
    const t=Math.min(1,(performance.now()-since.current)/900)
    const mix=t*t*(3-2*t)
    for(const key of keys)current[key].value.lerpColors(start[key].value,target[key].value,mix)
    if(t<1)invalidate()
  },-4)
  return <Context.Provider value={current}>{children}</Context.Provider>
}

export function SceneLighting(){
  const p=usePalette()
  const sun=useScene(s=>s.sunIntensity)
  const key=useRef<DirectionalLight>(null!),ambient=useRef<HemisphereLight>(null!)
  useFrame(()=>{
    key.current.color.copy(p.sunlight.value)
    ambient.current.color.copy(p.rim.value)
    ambient.current.groundColor.copy(p.shadowColor.value)
  },-3)
  return <><hemisphereLight ref={ambient} intensity={1.8}/><directionalLight ref={key} position={[-40,3.6,-68.8]} intensity={sun*2.1}/>
    <directionalLight position={[15,18,30]} intensity={1.05} color="#ffe7de"/></>
}
