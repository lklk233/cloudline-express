import { useState } from 'react'

import locomotive from '../assets/source/lux3d/列车车头-多视角PNG/02-左视图.png'
import carriage from '../assets/source/lux3d/客车厢-多视角PNG/02-左视图.png'
import bridge from '../assets/source/lux3d/高架铁路桥梁单元-多视角PNG/02-左侧视图.png'
import { calibration } from './config/calibration'
import { exteriorAssets } from './config/assets'
import './asset-preview.css'

const references = [
  { key: 'locomotive', name: '列车车头', image: locomotive },
  { key: 'carriage', name: '客车厢', image: carriage },
  { key: 'bridge', name: '高架桥段', image: bridge },
] as const

export function AssetPreview() {
  const [selected, select] = useState(0)
  const asset = references[selected]
  return <main>
    <header><small>CLOUDLINE EXPRESS</small><h1>云间列车</h1></header>
    <section aria-labelledby="stage"><div className="details"><small>阶段 M0</small>
      <h2 id="stage">外景资产预览</h2>
      <p>选择素材查看侧视参考图。三维场景将在模型校准阶段接入。</p>
      <nav aria-label="外景资产">{references.map((r, i) =>
        <button key={r.key} aria-pressed={selected === i} onClick={() => select(i)}>{r.name}</button>)}</nav>
    </div><figure><img src={asset.image} alt={asset.name + '左侧参考图'}/>
      <figcaption><strong>{exteriorAssets[asset.key].split('/').pop()}</strong>
      <span>包围盒 X × Y × Z（模型单位）<br/>{calibration.dimensionsXYZ[asset.key].join(' × ')}</span></figcaption></figure></section>
  </main>
}





