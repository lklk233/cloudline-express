import {useEffect,useMemo,useRef,type RefObject} from 'react'
import {useFrame,useThree} from '@react-three/fiber'
import {Group,Vector3} from 'three'
import {Model,type ModelKind,type ModelStatus} from '../Model'
import {calibration} from '../../config/calibration'
import {useScene} from '../store'
import type {Visibility} from '../World'
import {atDeparture,departure,stepTrain,terminus,track,vehicles,type Motion} from './track'

const forward=new Vector3(1,0,0)
export function TrainRig({motion,debug,visible,ready,report,onProgress}:{
  motion:RefObject<Motion>,debug:boolean,visible:Visibility,ready:boolean,
  report:(kind:ModelKind,status:ModelStatus)=>void,onProgress:(fraction:number)=>void,
}){
  const groups=useRef<(Group|null)[]>([])
  const {trainRunning,trainSpeed,resetTrip}=useScene()
  const invalidate=useThree(state=>state.invalidate)
  useEffect(()=>{invalidate()},[invalidate,ready,resetTrip,trainRunning,trainSpeed])
  const previousReset=useRef(resetTrip)
  const lastRun=useRef(false)
  const lastPercent=useRef(-1)
  const tangent=useMemo(()=>new Vector3(),[])
  useFrame((_,delta)=>{
    const m=motion.current
    const reset=previousReset.current!==resetTrip
    if(reset){Object.assign(m,atDeparture());previousReset.current=resetTrip}
    const run=ready && trainRunning && trainSpeed>0 && !document.hidden
    stepTrain(m,run && lastRun.current && !reset ? delta : 0,trainSpeed,run)
    lastRun.current=run
    vehicles.forEach(({kind,offset},i)=>{
      const group=groups.current[i]
      if(!group)return
      track.sample(m.distance-offset,group.position,tangent)
      group.position.y-=calibration.wheelBottom[kind]
      group.quaternion.setFromUnitVectors(forward,tangent)
    })
    const percent=m.distance>=terminus ? 1000 : Math.floor(1000*(m.distance-departure)/(terminus-departure))
    if(lastPercent.current!==percent){onProgress(percent/1000);lastPercent.current=percent}
    if(m.distance>=terminus && !useScene.getState().arrived)useScene.setState({trainRunning:false,arrived:true})
    if(run && m.distance<terminus)invalidate()
  },-2)
  return vehicles.map(({kind},i)=><group key={i} ref={node=>{groups.current[i]=node}} visible={visible[kind]}>
    <Model kind={kind} debug={debug} report={report}/>
  </group>)
}

