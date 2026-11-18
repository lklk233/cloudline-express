import {create} from 'zustand'
import {bounds,clampSetting,type NumericKey,type Quality} from './clouds/layout'
import {presetIds,scenePresets,visualDefaults,type PresetId} from '../config/scenePresets'
import type {Visibility} from './World'

import {readOverrides,type Overrides,type Region,type Paint} from '../config/regionColors'

export type CameraMode='scenic'|'orbit'|'follow'|'cinematic'
export type Inspection='rail'|'cloud'|null
type SceneSettings = Record<NumericKey,number> & {
  shot:CameraMode, inspection:Inspection, trainSpeed:number, trainRunning:boolean, overrides:Overrides, resetTrip:number,
  reducedMotion:boolean, debug:boolean, visible:Visibility, cloudQuality:Quality, cloudSeed:number,
  cloudsVisible:boolean, cloudAnimationRunning:boolean, skySource:'gradient',visualPreset:PresetId,
  saturation:number,panelOpen:boolean,uiHidden:boolean,
}
const matches=(query:string)=>typeof window!=='undefined' && window.matchMedia(query).matches
const defaults=():SceneSettings=>({
  ...visualDefaults('coralSunset'),cloudQuality:matches('(max-width: 760px)')?'low':'high',shot:'scenic',inspection:null,trainSpeed:4,trainRunning:true,overrides:{},resetTrip:0,
  reducedMotion:matches('(prefers-reduced-motion: reduce)'),debug:false,visible:{locomotive:true,carriage:true,bridge:true},
  panelOpen:!matches('(max-width: 760px)'),uiHidden:false,
})
export const settingsKey='cloudline-express-settings'
const numericKeys=Object.keys(bounds) as NumericKey[]
const publicKeys=[...numericKeys,'visualPreset','overrides','saturation','cloudsVisible','cloudAnimationRunning','cloudQuality',
  'cloudSeed','skySource','shot','trainSpeed','reducedMotion'] as const
export function restoreSettings(input:unknown):SceneSettings{
  const base=defaults()
  if(!input || typeof input!=='object')return base
  const data=input as Record<string,unknown>
  const raw=data.state ?? data
  if(!raw || typeof raw!=='object' || (typeof data.version==='number' && data.version>5))return base
  const s=raw as Record<string,unknown>
  const id=presetIds.find(id=>id===s.visualPreset) ?? 'coralSunset'
  Object.assign(base,visualDefaults(id),{cloudQuality:base.cloudQuality})
  base.overrides=readOverrides(s.overrides)
  for(const key of numericKeys)if(typeof s[key]==='number')base[key]=clampSetting(key,s[key],base[key])
  if(s.lowerCloudScale===undefined)base.lowerCloudScale=base.cloudScale
  for(const key of ['cloudsVisible','cloudAnimationRunning','reducedMotion'] as const)
    if(typeof s[key]==='boolean')base[key]=s[key]
  if(typeof s.saturation==='number' && Number.isFinite(s.saturation))base.saturation=Math.max(.5,Math.min(1.6,s.saturation))
  if(typeof s.trainSpeed==='number' && Number.isFinite(s.trainSpeed))base.trainSpeed=Math.max(0,Math.min(12,s.trainSpeed))
  if(typeof s.cloudSeed==='number' && Number.isSafeInteger(s.cloudSeed))base.cloudSeed=s.cloudSeed
  if(s.cloudQuality==='high'||s.cloudQuality==='low')base.cloudQuality=s.cloudQuality
  if(s.shot==='orbit'||s.shot==='follow'||s.shot==='cinematic')base.shot=s.shot
  // The only validated sky source is gradient, including for every legacy backgroundMode.
  return base
}
function snapshot(s:SceneSettings){
  return JSON.stringify({version:5,state:Object.fromEntries(publicKeys.map(key=>[key,s[key]]))})
}
function initial(){
  if(typeof window==='undefined')return defaults()
  try{
    const raw=localStorage.getItem(settingsKey)
    const restored=restoreSettings(raw?JSON.parse(raw):null)
    if(raw)localStorage.setItem(settingsKey,snapshot(restored))
    return restored
  }catch{return defaults()}
}
export const useScene=create<SceneSettings>(()=>initial())
if(typeof window!=='undefined'){
  let last=snapshot(useScene.getState())
  useScene.subscribe(s=>{
    const next=snapshot(s)
    if(next!==last){try{localStorage.setItem(settingsKey,next);last=next}catch{/* Private storage may be unavailable. */}}
  })
}
export function selectPreset(id:PresetId){
  useScene.setState({...scenePresets[id].settings,visualPreset:id})
}
export function editRegion(region:Region,paint?:Paint){
  useScene.setState(s=>{
    const entries={...s.overrides[s.visualPreset]}
    if(paint)entries[region]=paint
    else delete entries[region]
    return {overrides:{...s.overrides,[s.visualPreset]:entries}}
  })
}
export function resetPreset(){useScene.setState({...visualDefaults(useScene.getState().visualPreset),overrides:{...useScene.getState().overrides,[useScene.getState().visualPreset]:{}},cloudQuality:defaults().cloudQuality})}
export function factoryReset(){useScene.setState(s=>({...defaults(),panelOpen:s.panelOpen,resetTrip:s.resetTrip+1}))}
export function setNumber(key:NumericKey,value:number){
  useScene.setState(s=>({[key]:clampSetting(key,value,s[key])}))
}
export function resetTrain(){useScene.setState(s=>({resetTrip:s.resetTrip+1,trainRunning:false}))}
