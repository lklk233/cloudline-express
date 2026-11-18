import { useLayoutEffect, useRef } from 'react'
import {Resolution} from './Resolution'
import {CameraRig} from './CameraRig'
import {TrainRig} from './train/TrainRig'
import {atDeparture} from './train/track'
import { InstancedMesh, Matrix4 } from 'three'
import { calibration as c } from '../config/calibration'
import { Model, type ModelKind, type ModelStatus } from './Model'
import {CloudSystem} from './clouds/CloudSystem'
import {PaletteProvider,SceneLighting} from './Palette'
import { Sky } from './Sky'

export type Visibility = Record<ModelKind, boolean>
function Track({debug}: {debug: boolean}) {
  const length = c.trackPoints[1][0] - c.trackPoints[0][0]
  const count = Math.floor(length / .75)
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
export function World({onDpr,ready, onProgress, debug, visible, report}: {onDpr:(dpr:number)=>void,ready:boolean, onProgress:(fraction:number)=>void, debug: boolean, visible: Visibility, report: (kind:ModelKind,status:ModelStatus)=>void}) {
  const motion=useRef(atDeparture())
  return <PaletteProvider>
    <Resolution onChange={onDpr}/><CameraRig motion={motion}/><Sky/><CloudSystem/>
    <SceneLighting/>
    <group visible={visible.bridge}>{c.bridgeCenters.map(x => <group key={x} position-x={x}><Model kind="bridge" debug={debug} report={report}/></group>)}<Track debug={debug}/></group>
    <TrainRig motion={motion} debug={debug} visible={visible} ready={ready} onProgress={onProgress} report={report}/>
  </PaletteProvider>
}


