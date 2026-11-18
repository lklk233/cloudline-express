import {cloudDefaults} from './cloudDefaults'

export const scenePresets = {
  coralSunset: {
    name:'珊瑚晚霞', sky:'#398BD4', horizon:'#FFC2AD', sunlight:'#FFAF67', cloud:'#FF6585', shadow:'#713761', rim:'#FFD2AF', mist:'#FFC5BD',
    settings:{cloudDensity:.65,cloudShadowStrength:.55,cloudEdgeSoftness:.35,sunIntensity:1,saturation:1.12,fogStrength:.24},
  },
  orangeGlow: {
    name:'橘色暮光', sky:'#758FB9', horizon:'#FFCB8D', sunlight:'#FFAE52', cloud:'#FF9959', shadow:'#99516B', rim:'#FFEDD0', mist:'#FFCF99',
    settings:{cloudDensity:.58,cloudShadowStrength:.42,cloudEdgeSoftness:.47,sunIntensity:1.35,saturation:1.04,fogStrength:.32},
  },
  violetDusk: {
    name:'紫夜航线', sky:'#3E4797', horizon:'#B381BF', sunlight:'#FFB390', cloud:'#BE79CA', shadow:'#403361', rim:'#F6B6D0', mist:'#C0A6DC',
    settings:{cloudDensity:.72,cloudShadowStrength:.73,cloudEdgeSoftness:.40,sunIntensity:.65,saturation:1.22,fogStrength:.38},
  },
} as const
export type PresetId=keyof typeof scenePresets
export const presetIds=Object.keys(scenePresets) as PresetId[]
export function visualDefaults(id:PresetId){
  return {...cloudDefaults,...scenePresets[id].settings,visualPreset:id}
}
