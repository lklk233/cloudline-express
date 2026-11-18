import {expect,it} from 'vitest'
import {Vector3} from 'three'
import {atDeparture,departure,stepTrain,repeatPosition,track,TrackPath,vehicles} from '../src/scene/train/track'
import {calibration as c} from '../src/config/calibration'

it('samples individual body positions by arc length across unequal segments',()=>{
  const path=new TrackPath([[0,0,0],[2,0,0],[2,0,9]])
  const p=new Vector3(),t=new Vector3()
  path.sample(5,p,t);expect(p.toArray()).toEqual([2,0,3]);expect(t.toArray()).toEqual([0,0,1])
  path.sample(1,p,t);expect(p.toArray()).toEqual([1,0,0]);expect(t.toArray()).toEqual([1,0,0])
})
it('keeps the entire consist on the rails with calibrated coupler gaps',()=>{
  const p=new Vector3(),t=new Vector3()
  for(const head of [departure,track.length/2,track.length-8]){
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
it.each([.5,4,12])('cruises continuously at %s units/s across 10,000 spans',setting=>{
  const m=atDeparture()
  for(let i=0;i<20;i++)stepTrain(m,.25,setting,true)
  expect(m.speed).toBe(setting)
  const start=m.distance
  const steps=Math.ceil(10000*c.span/(.25*setting))
  for(let i=0;i<steps;i++)stepTrain(m,.25,setting,true)
  expect(m.speed).toBe(setting)
  expect(m.distance-start).toBeCloseTo(steps*.25*setting,6)
  expect(repeatPosition(0,m.distance,49*c.span)).toBeLessThan(49*c.span/2)
})
it('holds position on pause or speed zero and resumes from the same point',()=>{
  const m=atDeparture()
  for(let i=0;i<50;i++)stepTrain(m,.1,8,true)
  const d=m.distance
  stepTrain(m,4,8,false);expect(m).toEqual({distance:d,speed:0})
  stepTrain(m,.1,0,true);expect(m.distance).toBe(d)
  stepTrain(m,.1,4,true);expect(m.distance).toBeGreaterThan(d)
  expect(atDeparture()).toEqual({distance:0,speed:0})
})

it('keeps each pooled bridge one span apart across wrap and after a long trip',()=>{
  const span=c.span
  const slots=49
  for(const distance of [0,span-.001,span,span+.001,span*slots/2,span*10000+.1,1e9+.1]){
    const points=Array.from({length:slots},(_,i)=>repeatPosition((i-24)*span,distance,slots*span)).sort((a,b)=>a-b)
    for(let i=1;i<points.length;i++)expect(points[i]-points[i-1]).toBeCloseTo(span,6)
    expect(Math.max(...points.map(Math.abs))).toBeLessThanOrEqual(slots*span/2)
  }
})
