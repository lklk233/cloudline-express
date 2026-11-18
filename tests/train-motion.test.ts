import {expect,it} from 'vitest'
import {Vector3} from 'three'
import {atDeparture,departure,stepTrain,terminus,track,TrackPath,vehicles} from '../src/scene/train/track'
import {calibration as c} from '../src/config/calibration'

it('samples individual body positions by arc length across unequal segments',()=>{
  const path=new TrackPath([[0,0,0],[2,0,0],[2,0,9]])
  const p=new Vector3(),t=new Vector3()
  path.sample(5,p,t);expect(p.toArray()).toEqual([2,0,3]);expect(t.toArray()).toEqual([0,0,1])
  path.sample(1,p,t);expect(p.toArray()).toEqual([1,0,0]);expect(t.toArray()).toEqual([1,0,0])
})
it('keeps the entire consist on the rails with calibrated coupler gaps',()=>{
  const p=new Vector3(),t=new Vector3()
  for(const head of [departure,(departure+terminus)/2,terminus]){
    let rear=Infinity
    for(const {kind,offset} of vehicles){
      track.sample(head-offset,p,t)
      const half=c.dimensionsXYZ[kind][0]/2
      expect(p.y).toBe(c.railTop)
      expect(t.x).toBe(1)
      expect(p.x-half).toBeGreaterThan(c.trackPoints[0][0])
      expect(p.x+half).toBeLessThan(c.trackPoints[1][0])
      if(isFinite(rear))expect(rear-p.x-half).toBeCloseTo(c.couplerGap,8)
      rear=p.x-half
    }
  }
})
it.each([.5,4,12])('travels at %s units/s, brakes progressively and remains stopped',setting=>{
  const m=atDeparture()
  let cruise=false,braking=false
  for(let i=0;i<40000 && m.distance<terminus;i++){
    const before={...m}
    const dt=[.016,.025,.044,.1][i%4]
    stepTrain(m,dt,setting,true)
    expect(m.distance).toBeGreaterThanOrEqual(before.distance)
    expect(m.distance).toBeLessThanOrEqual(terminus)
    expect(m.speed).toBeLessThanOrEqual(setting)
    if(m.speed===setting)cruise=true
    if(m.speed<before.speed && m.speed>0)braking=true
    if(before.speed===setting && m.speed===setting)expect(m.distance-before.distance).toBeCloseTo(setting*dt)
  }
  expect(cruise && braking).toBe(true)
  expect(m).toEqual({distance:terminus,speed:0})
  stepTrain(m,.2,12,true);expect(m.distance).toBe(terminus)
})
it('holds position on pause or speed zero and resumes from the same point',()=>{
  const m=atDeparture()
  for(let i=0;i<50;i++)stepTrain(m,.1,8,true)
  const d=m.distance
  stepTrain(m,4,8,false);expect(m).toEqual({distance:d,speed:0})
  stepTrain(m,.1,0,true);expect(m.distance).toBe(d)
  stepTrain(m,.1,4,true);expect(m.distance).toBeGreaterThan(d)
  expect(atDeparture()).toEqual({distance:departure,speed:0})
})
