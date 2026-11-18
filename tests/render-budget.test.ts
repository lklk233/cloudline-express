import {expect,it} from 'vitest'
import {renderBudget,nextDpr} from '../src/scene/renderBudget'

it('caps desktop and narrow high-DPI viewports without removing mist',()=>{
  for(const compact of [false,true]){
    const lo=renderBudget('low',compact,3),hi=renderBudget('high',compact,3)
    expect(lo.max).toBeLessThan(hi.max)
    expect(lo.mist).toBeGreaterThan(0)
    expect(lo.mist).toBeLessThan(hi.mist)
    expect(lo.basin).toBeLessThan(hi.basin)
  }
  expect(renderBudget('low',true,3).max).toBe(1)
})
it('reduces and restores DPR within the selected budget',()=>{
  expect(nextDpr(1,40,.7,1)).toBe(.85)
  expect(nextDpr(.7,48,.7,1)).toBe(.7)
  expect(nextDpr(.85,24,.7,1)).toBe(.85)
  expect(nextDpr(.85,16,.7,1)).toBe(.95)
  expect(nextDpr(.95,16,.7,1)).toBe(1)
})
