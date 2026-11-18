import {expect,it} from 'vitest'
import {editRegion,resetPreset,restoreSettings,selectPreset,useScene} from '../src/scene/store'
import {regionIds,swatches,validHex} from '../src/config/regionColors'
it('offers exactly 256 unique RGB choices',()=>{
  expect(new Set(swatches).size).toBe(256)
  expect(swatches.every(validHex)).toBe(true)
})
it('round trips independent regions and preset edits; restores legacy settings',()=>{
  const base=restoreSettings({version:4,state:{trainSpeed:7,cloudQuality:'low'}})
  expect(base).toMatchObject({trainSpeed:7,cloudQuality:'low',overrides:{}})
  useScene.setState(base,true)
  const paint={mode:'gradient',start:'#112233',end:'#AABBCC'} as const
  for(const region of regionIds)editRegion(region,paint)
  selectPreset('orangeGlow')
  editRegion('vista',{...paint,mode:'solid'})
  const restored=restoreSettings({version:5,state:useScene.getState()})
  expect(restored.overrides.orangeGlow?.vista?.mode).toBe('solid')
  expect(Object.keys(restored.overrides.coralSunset!)).toHaveLength(6)
  resetPreset()
  selectPreset('coralSunset')
  editRegion('bank')
  expect(Object.keys(useScene.getState().overrides.coralSunset!)).toHaveLength(5)
  expect(useScene.getState().overrides.orangeGlow).toEqual({})
})
it('drops malformed color overrides while retaining valid regions and v4 values',()=>{
  const saved=restoreSettings({version:5,state:{trainSpeed:8,overrides:{
    coralSunset:{bank:{mode:'gradient',start:'#1',end:'#FFFFFF'},vista:{mode:'solid',start:'#12ab56',end:'#ffffff'}},
    orangeGlow:null,unrecognized:{},
  }}})
  expect(saved.trainSpeed).toBe(8)
  expect(saved.overrides).toEqual({coralSunset:{vista:{mode:'solid',start:'#12AB56',end:'#FFFFFF'}}})
})
