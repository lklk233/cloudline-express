import {usePalette} from '../Palette'
import {renderBudget} from '../renderBudget'
import {CloudBasin} from './CloudBasin'
import {Suspense,useMemo,useRef} from 'react'
import {useFrame,useThree} from '@react-three/fiber'
import {BackSide,DoubleSide,Vector2} from 'three'
import {useScene} from '../store'
import {advance,randomFrom,trackFrame,worldPosition,type Clock} from './layout'
import {farVertex,farFragment,mistVertex,mistFragment} from './shaders'

import {VolumeBanks} from './VolumeBanks'

export function CloudSystem() {
  const s=useScene()
  const palette=usePalette()
  const defines=useMemo(()=>s.cloudQuality==='low'?{CLOUD_LOW:1}:{},[s.cloudQuality])
  const invalidate=useThree(state=>state.invalidate)
  const clock=useRef<Clock>({x:0,z:0,mist:0})
  const travel=useMemo(()=>({value:new Vector2()}),[])
  const mistClock=useMemo(()=>({value:new Vector2()}),[])
  const phases=useMemo(()=>{
    const r=randomFrom(s.cloudSeed)
    return Array.from({length:16},()=>r()*810)
  },[s.cloudSeed])
  const compact=useThree(state=>state.size.width<=760)
  const budget=renderBudget(s.cloudQuality,compact,1)
  useFrame((_,delta)=>{
    if(!s.cloudsVisible || !s.cloudAnimationRunning || (!s.cloudSpeed && !s.mistSpeed))return
    advance(clock.current,delta,s.cloudSpeed,s.windDirection,s.mistSpeed,true)
    travel.value.set(clock.current.x,clock.current.z)
    mistClock.value.x=clock.current.mist
    invalidate()
  })
  const f=trackFrame
  return <group visible={s.cloudsVisible}>
    {Array.from({length:s.cloudLayerCount},(_,i)=>{
      const r=385-i*26
      return <mesh key={i} renderOrder={-10+i} position={[f.x,f.railY+24-i*4.8+s.cloudHeight,f.z]}>
        <cylinderGeometry args={[r,r,520,budget.farSegments,1,true]}/>
        <shaderMaterial key={s.cloudQuality} defines={defines} side={BackSide} transparent depthWrite={false} uniforms={{
          ...palette,travel,seed:{value:phases[i]},layer:{value:i},density:{value:s.cloudDensity},softness:{value:s.cloudEdgeSoftness},
        }} vertexShader={farVertex} fragmentShader={farFragment} toneMapped={false}/>
      </mesh>
    })}
    <CloudBasin travel={travel} seed={phases[0]}/>
    <Suspense fallback={null}><VolumeBanks travel={travel}/></Suspense>
    {Array.from({length:budget.mist},(_,i)=>{
      const lateral=i%2===0?6+i*1.5:-6-i*2.1
      const [x,z]=worldPosition((phases[i]%102)-51,lateral)
      const y=Math.min(f.railY-1.4,-6+(i%3)+s.cloudHeight+s.lowerCloudHeight)
      return <mesh key={i} position={[x,y-2.2,z]} rotation={[-.45,(i%3-1)*.19,0]} visible={s.fogStrength>0}>
        <planeGeometry args={[42+i%4*8,4.2]}/>
        <shaderMaterial key={s.cloudQuality} defines={defines} side={DoubleSide} depthWrite={false} transparent uniforms={{
          ...palette,mistTime:mistClock,strength:{value:s.fogStrength},seed:{value:phases[i+4]},
        }} vertexShader={mistVertex} fragmentShader={mistFragment} toneMapped={false}/>
      </mesh>
    })}
  </group>
}



