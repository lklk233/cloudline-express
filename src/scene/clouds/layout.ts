import { calibration as c } from '../../config/calibration'

export const bounds = {
  cloudSpeed:[0,1,.01], cloudDensity:[0,1,.01], cloudLayerCount:[2,8,1],
  cloudScale:[.5,2,.05], lowerCloudScale:[.5,2,.05], cloudHeight:[-20,20,.5], lowerCloudHeight:[-10,4,.5], windDirection:[0,360,1],
  mistSpeed:[0,1,.01], cloudShadowStrength:[0,1,.01], cloudEdgeSoftness:[0,1,.01],
  fogStrength:[0,1,.01], sunIntensity:[0,2,.05],
} as const
export type NumericKey = keyof typeof bounds
export function clampSetting(key:NumericKey, value:number, fallback:number) {
  if(!Number.isFinite(value)) return fallback
  const [min,max,step]=bounds[key]
  return Math.max(min,Math.min(max,step===1 ? Math.round(value) : value))
}

export function randomFrom(seed:number) {
  let n=(seed ^ Math.floor(seed/4294967296)) >>> 0
  return () => {
    n=(n+0x6D2B79F5)>>>0
    let h=Math.imul(n^(n>>>15),1|n)
    h^=h+Math.imul(h^(h>>>7),61|h)
    return ((h^(h>>>14))>>>0)/4294967296
  }
}
// One reusable belt around the consist. Fade out at both boundaries before a slot changes course.
export const beltLength=448
export function courseVariation(seed:number,slot:number,course:number){
  if(course===0)return 0
  const value=Math.imul(course,0x45d9f3b)^Math.imul(slot+1,0x27d4eb2d)^seed
  return randomFrom(value)()-.5
}
export const cloudModelCount=16
export const capacity={high:38,low:24}
export function createBackdropBanks(seed:number){
  const r=randomFrom(seed ^ 0x42c715)
  return [5,-29,47,-63,78].map(x=>({
    x:x+(r()-.5)*12,z:-31-r()*12,y:-3+r()*4,
    rx:12+r()*7,ry:4+r()*4,rz:7+r()*4,
    yaw:(r()-.5)*1.5,variant:Math.floor(r()*cloudModelCount),
  }))
}
export type Quality=keyof typeof capacity
export function bankCount(density:number,quality:Quality) {
  return Math.round(capacity[quality]*Math.max(0,Math.min(1,density)))
}
export function createBanks(seed:number) {
  const r=randomFrom(seed)
  // Staggered anchor regions leave open corridors even at high density.
  const anchors=Array.from({length:7},(_,i)=>({
    x:(i-3)*36+(r()-.5)*10,
    z:i===2 || i===5 ? 10+r()*12 : -50-r()*12,
    y:i===2 || i===5 ? -5+r()*3 : 4+r()*8,
  }))
  // Draw without replacement so short runs still display distinct silhouettes.
  const variants=Array.from({length:cloudModelCount},(_,i)=>i)
  const pick=randomFrom(seed ^ 0x39a4e512)
  for(let i=variants.length-1;i>0;i--){
    const j=Math.floor(pick()*(i+1))
    ;[variants[i],variants[j]]=[variants[j],variants[i]]
  }
  return Array.from({length:capacity.high},(_,i)=>{
    const a=anchors[i%anchors.length]
    const main=i<anchors.length
    const size=main ? 13+r()*5 : (i<anchors.length*3 ? 9+r()*4 : 2+r()*4)
    const radius=main ? 2 : 9+r()*7
    return {x:a.x+(r()-.5)*radius*2,z:a.z+(r()-.5)*radius,
      y:a.y+(r()-.5)*(main?3:5)-(main?0:3),rx:size*(1.15+r()*.6),
      ry:size*(main?1.0+r()*.48:.37+r()*.50),rz:size*(.57+r()*.4),
      yaw:(r()-.5)*1.8,variant:variants[i%cloudModelCount]}
  })
}

// Broad, partially overlapping banks step down from the piers into the basin.
export function createLowerBanks(seed:number){
  const r=randomFrom(seed ^ 0x13d5ace)
  return Array.from({length:40},(_,i)=>{
    const row=i%4
    const along=(Math.floor(i/4)-4.5)*22+(r()-.5)*17
    return {x:along,z:26-row*23+(r()-.5)*18,y:-12-r()*5,
      rx:23+r()*14,ry:6+r()*6,rz:17+r()*12,
      yaw:(r()-.5)*1.5,variant:Math.floor(r()*cloudModelCount)}
  })
}

// The planar basis follows both M1 endpoints. Lateral clearance includes the widest vehicle and a buffer.
const [a,b]=c.trackPoints
const length=Math.hypot(b[0]-a[0],b[2]-a[2])
const ux=(b[0]-a[0])/length, uz=(b[2]-a[2])/length
export const trackFrame={x:(a[0]+b[0])/2,z:(a[2]+b[2])/2,ux,uz,length,
  railY:Math.min(a[1],b[1]), halfClear:Math.max(c.dimensionsXYZ.locomotive[2],c.dimensionsXYZ.carriage[2])/2+2}
export function worldPosition(along:number,lateral:number) {
  const f=trackFrame
  return [f.x+along*f.ux-lateral*f.uz,f.z+along*f.uz+lateral*f.ux] as const
}
// Geometry stays within its unit sphere. Reserve the full drift amplitude on both horizontal axes.
export const driftLimit=4
export function safeHeight(along:number,lateral:number,desired:number,rx:number,ry:number,rz:number) {
  const f=trackFrame, margin=driftLimit*Math.SQRT2
  const radius=Math.max(rx,rz)+margin
  const nearTrack=Math.abs(lateral)<f.halfClear+radius
  // On the viewing side, retain a sightline to the wheels even at maximum cloud height.
  const ceiling=nearTrack ? f.railY-2.0 : lateral>0 ? f.railY-1.4 : Infinity
  return Math.min(desired,ceiling-ry)
}
export type Clock={x:number,z:number,mist:number}
export function advance(clock:Clock,delta:number,speed:number,wind:number,mistSpeed:number,running:boolean) {
  if(!running) return
  const dt=Math.max(0,Math.min(.06,delta)), angle=wind*Math.PI/180
  clock.x+=dt*speed*Math.cos(angle)
  clock.z+=dt*speed*Math.sin(angle)
  clock.mist+=dt*mistSpeed
}
