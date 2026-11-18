import {renderBudget} from '../src/scene/renderBudget'
import {expect,it} from 'vitest'
import {advance,bankCount,capacity,clampSetting,createBanks,driftLimit,safeHeight,trackFrame,worldPosition} from '../src/scene/clouds/layout'
import {calibration} from '../src/config/calibration'

it('recreates the same banks from the seed and varies their cloud shapes between seeds',()=>{
  const banks=createBanks(20261118)
  expect(banks).toEqual(createBanks(20261118))
  expect(banks[0]).not.toEqual(createBanks(119)[0])
  expect(banks.length).toBe(capacity.high)
  expect(new Set(banks.slice(0,16).map(b=>b.variant)).size).toBe(16)
  expect(Math.max(...banks.map(b=>b.rx))).toBeGreaterThan(3*Math.min(...banks.map(b=>b.rx)))
})

it('preserves the three tiers under low quality and supports an empty bank field',()=>{
  expect(bankCount(.65,'high')).toBe(25)
  expect(bankCount(.65,'low')).toBe(16)
  expect(bankCount(0,'high')).toBe(0)
  const mistCount={low:renderBudget('low',true,3).mist,high:renderBudget('high',true,3).mist}
  expect(mistCount.low).toBeGreaterThan(0)
  expect(mistCount.low).toBeLessThan(mistCount.high)
})

it('clamps range inputs and rejects non-finite settings',()=>{
  expect(clampSetting('cloudLayerCount',12,5)).toBe(8)
  expect(clampSetting('cloudLayerCount',2.7,5)).toBe(3)
  expect(clampSetting('cloudHeight',-60,0)).toBe(-20)
  expect(clampSetting('fogStrength',Infinity,.24)).toBe(.24)
})

it('pauses all three clocks and lets mist drift while A and B are still',()=>{
  const t={x:0,z:0,mist:0}
  advance(t,5,1,90,.5,false)
  expect(t).toEqual({x:0,z:0,mist:0})
  advance(t,5,0,0,.5,true)
  expect(t).toEqual({x:0,z:0,mist:.03})
  advance(t,1,1,90,0,true)
  expect(t.x).toBeCloseTo(0)
  expect(t.z).toBeCloseTo(.06)
  expect(t.mist).toBe(.03)
})

it('anchors the corridor to the track endpoints',()=>{
  for(const [i,sign] of [-1,1].entries()){
    const [x,z]=worldPosition(sign*trackFrame.length/2,0)
    expect([x,z]).toEqual([calibration.trackPoints[i][0],calibration.trackPoints[i][2]])
  }
})

it('keeps complete rotated cloud bounds clear at the largest scale and highest setting',()=>{
  const f=trackFrame
  const scale=2
  let checks=0, worstTop=-Infinity
  for(const seed of [0,20261118,-441]){
    for(const b of createBanks(seed)){
      const along=b.x,side=b.z
      const rx=Math.hypot(b.rx,b.rz)*scale,ry=b.ry*scale,rz=rx
      const y=safeHeight(along,side,b.y+20,rx,ry,rz)
      for(const dx of [-driftLimit,0,driftLimit])for(const dz of [-driftLimit,0,driftLimit]){
        if(Math.abs(along+dx)>f.length/2+rx || Math.abs(side+dz)>f.halfClear+rz)continue
        worstTop=Math.max(worstTop,y+ry)
        checks++
      }
    }
  }
  expect(checks).toBeGreaterThan(100)
  expect(worstTop).toBeLessThanOrEqual(f.railY-1.99)
})
