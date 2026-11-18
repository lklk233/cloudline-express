import {Vector3} from 'three'
import {calibration,consist} from '../../config/calibration'

export class TrackPath {
  readonly points: Vector3[]
  readonly lengths: number[] = [0]
  constructor(points: readonly (readonly [number,number,number])[]) {
    this.points=points.map(([x,y,z])=>new Vector3(x,y,z))
    for(let i=1;i<this.points.length;i++){
      const segment=this.points[i].distanceTo(this.points[i-1])
      if(!segment) throw new Error('相邻轨道点重合')
      this.lengths.push(this.lengths[i-1]+segment)
    }
    if(this.points.length<2) throw new Error('轨道至少需要两个标定点')
  }
  get length(){return this.lengths[this.lengths.length-1]}
  sample(distance:number,position:Vector3,tangent:Vector3){
    const d=Math.min(this.length,Math.max(0,distance))
    let i=1
    while(i<this.lengths.length-1 && this.lengths[i]<d)i++
    tangent.subVectors(this.points[i],this.points[i-1]).normalize()
    position.copy(this.points[i-1]).addScaledVector(tangent,d-this.lengths[i-1])
  }
}

export const track=new TrackPath(calibration.trackPoints)
export const vehicles=consist.map(({kind,x})=>({kind,offset:calibration.headX-x}))
const tail=vehicles[vehicles.length-1]
const clearance=1
export const departure=tail.offset+calibration.dimensionsXYZ[tail.kind][0]/2+clearance
export const terminus=track.length-calibration.dimensionsXYZ.locomotive[0]/2-clearance
export interface Motion {distance:number;speed:number}
export const atDeparture=():Motion=>({distance:departure,speed:0})

const acceleration=3.0, brake=2.4
export function stepTrain(m:Motion,dt:number,setting:number,running:boolean){
  const target=Math.min(12,Math.max(0,setting))
  if(!running || target===0 || m.distance>=terminus){m.speed=0;return}
  const time=Math.min(.25,Math.max(0,dt))
  if(time===0)return
  const remaining=terminus-m.distance
  // End this step with enough distance to brake continuously at the configured rate.
  const half=brake*time/2
  const safeSpeed=Math.max(0,Math.sqrt(Math.max(0,half*half+2*brake*remaining-brake*time*m.speed))-half)
  const next=Math.min(safeSpeed,Math.max(m.speed-brake*time,Math.min(target,m.speed+acceleration*time)))
  m.distance=Math.min(terminus,m.distance+(m.speed+next)*time/2)
  m.speed=next
  if(terminus-m.distance<.001){m.distance=terminus;m.speed=0}
}
