import {useLayoutEffect,useRef} from 'react'
import {useFrame,useThree} from '@react-three/fiber'
import {nextDpr,renderBudget} from './renderBudget'
import {useScene} from './store'

export function Resolution({onChange}:{onChange:(dpr:number)=>void}){
  const quality=useScene(s=>s.cloudQuality)
  const {size,gl,invalidate}=useThree()
  const {min,max}=renderBudget(quality,size.width<=760,window.devicePixelRatio)
  const windowStats=useRef({elapsed:0,count:0,since:0})
  useLayoutEffect(()=>{
    onChange(max);invalidate()
    windowStats.current={elapsed:0,count:0,since:performance.now()}
  },[min,max,size.width,size.height,onChange,invalidate])
  useFrame((_,dt)=>{
    const s=windowStats.current
    if(document.hidden || dt>.5 || dt<=0){s.elapsed=0;s.count=0;return}
    s.elapsed+=dt;s.count++
    const now=performance.now()
    if(s.elapsed<2 || now-s.since<3500)return
    const current=gl.getPixelRatio()
    const next=nextDpr(current,1000*s.elapsed/s.count,min,max)
    if(next!==current)onChange(next)
    s.elapsed=0;s.count=0;s.since=now
  },-5)
  return null
}
