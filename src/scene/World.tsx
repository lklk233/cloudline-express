import { useLayoutEffect, useRef } from 'react'
import {Resolution} from './Resolution'
import {CameraRig} from './CameraRig'
import {TrainRig} from './train/TrainRig'
import {useFrame} from '@react-three/fiber'
import {atDeparture,repeatPosition,type Motion} from './train/track'
import { Group, InstancedMesh, Matrix4 } from 'three'
import { calibration as c } from '../config/calibration'
import { Model, type ModelKind, type ModelStatus } from './Model'
import {CloudSystem} from './clouds/CloudSystem'
import {PaletteProvider,SceneLighting} from './Palette'
import { Sky } from './Sky'

export type Visibility = Record<ModelKind, boolean>
const bridgeSlots=Array.from({length:49},(_,i)=>i-24)
function Track({debug}: {debug: boolean}) {
  const length = bridgeSlots.length*c.span
  const count = bridgeSlots.length*33
  const sleepers = useRef<InstancedMesh>(null!)
  useLayoutEffect(() => {
    const matrix = new Matrix4()
    for(let i=0;i<count;i++) {
      matrix.makeTranslation(-length/2 + (i+.5)*length/count, c.sleeperHeight/2, 0)
      sleepers.current.setMatrixAt(i, matrix)
    }
    sleepers.current.instanceMatrix.needsUpdate = true
    sleepers.current.computeBoundingSphere()
  }, [count, length])
  return <>
    <instancedMesh args={[undefined,undefined,count]} ref={sleepers}>
      <boxGeometry args={[.22,c.sleeperHeight,2.6]}/><meshStandardMaterial color="#64473c"/>
    </instancedMesh>
    {[-c.railOffset,c.railOffset].map(z => <mesh key={z} position={[0,(c.railTop+c.sleeperHeight)/2,z]}>
      <boxGeometry args={[length,c.railTop-c.sleeperHeight,c.railWidth]}/>
      <meshStandardMaterial color={debug ? '#ffca68' : '#a89482'} metalness={.28} roughness={.58}/>
    </mesh>)}
    {debug && <mesh position-y={c.railTop+.002}><boxGeometry args={[length,.008,.035]}/><meshBasicMaterial color="#00ffb7"/></mesh>}
  </>
}
function Railway({motion,debug,report}:{motion:React.RefObject<Motion>,debug:boolean,report:(kind:ModelKind,status:ModelStatus)=>void}){
  const bridges=useRef<(Group|null)[]>([])
  const rails=useRef<Group>(null!)
  useFrame(()=>{
    const phase=motion.current.distance%c.span
    rails.current.position.x=-phase
    for(const [i,slot] of bridgeSlots.entries()){
      const bridge=bridges.current[i]
      if(bridge)bridge.position.x=repeatPosition(slot*c.span,motion.current.distance,bridgeSlots.length*c.span)
    }
  },-1)
  return <>{bridgeSlots.map((slot,i)=><group key={slot} name="bridge-span" ref={node=>{bridges.current[i]=node}}>
    <Model kind="bridge" debug={debug} report={report}/></group>)}<group ref={rails}><Track debug={debug}/></group></>
}
export function World({onDpr,ready, onDistance, debug, visible, report}: {onDpr:(dpr:number)=>void,ready:boolean, onDistance:(distance:number)=>void, debug: boolean, visible: Visibility, report: (kind:ModelKind,status:ModelStatus)=>void}) {
  const motion=useRef(atDeparture())
  return <PaletteProvider>
    <Resolution onChange={onDpr}/><CameraRig/><Sky/><CloudSystem motion={motion}/>
    <SceneLighting/>
    <group visible={visible.bridge}><Railway motion={motion} debug={debug} report={report}/></group>
    <TrainRig motion={motion} debug={debug} visible={visible} ready={ready} onDistance={onDistance} report={report}/>
  </PaletteProvider>
}


