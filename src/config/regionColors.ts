import {presetIds,scenePresets,type PresetId} from './scenePresets'

export const regions={
  basin:'云海',bank:'云团',backdrop:'背景云',lower:'桥梁下云层',skyBand:'天空背景',vista:'远景',
} as const
export type Region=keyof typeof regions
export const regionIds=Object.keys(regions) as Region[]
export interface Paint {mode:'solid'|'gradient';start:string;end:string}
export type Overrides=Partial<Record<PresetId,Partial<Record<Region,Paint>>>>
export const validHex=(value:unknown):value is string=>typeof value==='string' && /^#[0-9a-f]{6}$/i.test(value)
const byte=(n:number)=>n.toString(16).padStart(2,'0').toUpperCase()
const levels=[0,51,102,153,204,255]
export const swatches=levels.flatMap(r=>levels.flatMap(g=>levels.map(b=>'#'+byte(r)+byte(g)+byte(b))))
for(let i=1;i<=40;i++){
  let grey=Math.round(i*255/41)
  if(levels.includes(grey))grey++
  swatches.push('#'+byte(grey).repeat(3))
}
export function defaultPaint(id:PresetId,region:Region):Paint{
  const p=scenePresets[id]
  const ends:Record<Region,[string,string]>={basin:[p.shadow,p.rim],bank:[p.cloud,p.rim],backdrop:[p.shadow,p.cloud],
    lower:[p.shadow,p.mist],skyBand:[p.horizon,p.sky],vista:[p.mist,p.horizon]}
  const [start,end]=ends[region]
  return {mode:'gradient',start,end}
}
export function readOverrides(raw:unknown):Overrides{
  const result:Overrides={}
  if(!raw || typeof raw!=='object')return result
  for(const id of presetIds){
    const entries=(raw as Overrides)[id]
    if(!entries)continue
    for(const region of regionIds){
      const p=entries[region]
      if(p && (p.mode==='solid'||p.mode==='gradient') && validHex(p.start) && validHex(p.end)){
        (result[id]??={})[region]={mode:p.mode,start:p.start.toUpperCase(),end:p.end.toUpperCase()}
      }
    }
  }
  return result
}
