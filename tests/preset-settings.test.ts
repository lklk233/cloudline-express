import {beforeEach,expect,it} from 'vitest'
import {factoryReset,resetPreset,resetTrain,restoreSettings,selectPreset,useScene} from '../src/scene/store'
import {presetIds,scenePresets} from '../src/config/scenePresets'
beforeEach(()=>useScene.setState(restoreSettings(null),true))
it.each(presetIds)('applies %s to visual controls while preserving the journey',id=>{
  useScene.setState({trainRunning:false,shot:'orbit',cloudAnimationRunning:false})
  selectPreset(id)
  expect(useScene.getState()).toMatchObject({...scenePresets[id].settings,visualPreset:id,shot:'orbit',trainRunning:false,cloudAnimationRunning:false,resetTrip:0})
})
it('restores the selected visual defaults separately from the trip and factory resets',()=>{
  selectPreset('violetDusk')
  useScene.setState({saturation:.5,cloudLayerCount:2,cloudSeed:5,trainSpeed:9})
  resetPreset()
  expect(useScene.getState()).toMatchObject({visualPreset:'violetDusk',saturation:1.22,cloudLayerCount:5,cloudSeed:20261118,trainSpeed:9,resetTrip:0})
  resetTrain()
  expect(useScene.getState()).toMatchObject({trainRunning:false,visualPreset:'violetDusk',resetTrip:1})
  factoryReset()
  expect(useScene.getState()).toMatchObject({visualPreset:'coralSunset',saturation:1.12,trainRunning:true,trainSpeed:4,shot:'scenic',resetTrip:2})
})
it.each(['pointcloud','hybrid','panorama'])('migrates legacy %s and validates stored values',backgroundMode=>{
  const s=restoreSettings({version:2,state:{backgroundMode,visualPreset:'orangeGlow',saturation:6,cloudLayerCount:99,cloudSeed:4.2,cloudDensity:'broken',trainSpeed:-3}})
  expect(s).toMatchObject({visualPreset:'orangeGlow',skySource:'gradient',saturation:1.6,cloudLayerCount:8,cloudSeed:20261118,cloudDensity:.58,trainSpeed:0})
  expect(s).not.toHaveProperty('backgroundMode')
})
it('ignores invalid and future settings',()=>{
  for(const data of [null,3,{version:99,state:{saturation:1.6}},{state:{visualPreset:'unknown',saturation:NaN}}]){
    expect(restoreSettings(data)).toMatchObject({visualPreset:'coralSunset',saturation:1.12})
  }
})
