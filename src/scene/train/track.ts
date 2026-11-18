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
// Render in the train's moving frame so camera damping never crosses an origin jump.
export const headLocalX=calibration.trackPoints[0][0]+departure
export interface Motion {distance:number;speed:number}
export const atDeparture=():Motion=>({distance:0,speed:0})
export function repeatPosition(x:number,distance:number,period:number){
  return x-distance-period*Math.floor((x-distance+period/2)/period)
}
export function stepTrain(m:Motion,dt:number,setting:number,running:boolean){
  const target=Math.min(12,Math.max(0,setting))
  if(!running || target===0){m.speed=0;return}
  const time=Math.min(.25,Math.max(0,dt))
  const rate=target>=m.speed?3:2.4
  const ramp=Math.min(time,Math.abs(target-m.speed)/rate)
  const next=m.speed+Math.sign(target-m.speed)*rate*ramp
  m.distance+=(m.speed+next)*ramp/2+target*(time-ramp)
  m.speed=next
}
