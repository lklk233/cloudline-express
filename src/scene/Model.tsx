import { Component, Suspense, useEffect, useMemo, type ReactNode } from 'react'
import { useLoader } from '@react-three/fiber'
import { Box3, Mesh, MeshStandardMaterial } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { exteriorAssets } from '../config/assets'
import { calibration } from '../config/calibration'

export type ModelKind = keyof typeof exteriorAssets
export type ModelStatus = '就绪' | '占位' | '加载中'
type StatusHandler = (kind: ModelKind, status: ModelStatus) => void
const urls = import.meta.glob('../../assets/runtime/{train_locomotive,carriage,bridge_module}.glb', {
  eager: true, query: '?url', import: 'default',
}) as Record<string, string>

export class ErrorBoundary extends Component<{ children: ReactNode, fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

function Loaded({ kind, debug, report }: {kind: ModelKind, debug: boolean, report: StatusHandler}) {
  const url = urls['../../' + exteriorAssets[kind]]
  // A missing source is routed to the same explicit fallback as a decode failure.
  if (!url) throw new Error('缺少模型 ' + kind)
  return <LoadedScene url={url} kind={kind} debug={debug} report={report}/>
}
function LoadedScene({ url, kind, debug, report }: {url: string, kind: ModelKind, debug: boolean, report: StatusHandler}) {
  const { scene } = useLoader(GLTFLoader, url)
  const {object,materials}=useMemo(()=>{
    const object=scene.clone(true)
    const materials:MeshStandardMaterial[]=[]
    object.traverse(node=>{
      if(!(node instanceof Mesh) || !(node.material instanceof MeshStandardMaterial))return
      const material=node.material.clone()
      materials.push(material)
      node.material=material
      if(kind==='bridge'){
        material.color.setRGB(1.08,1.035,1.015)
        return
      }
      // Only the violet glass texels at window height emit warm light; keep painted bodywork and wheels intact.
      material.onBeforeCompile=shader=>{
        shader.vertexShader='varying vec3 trainLocal;\n'+shader.vertexShader.replace('#include <begin_vertex>',
          '#include <begin_vertex>\ntrainLocal=position;')
        shader.fragmentShader='varying vec3 trainLocal;\n'+shader.fragmentShader.replace('#include <emissivemap_fragment>',`
          #include <emissivemap_fragment>
          float glass=smoothstep(.018,.11,diffuseColor.b-diffuseColor.g)
                    *smoothstep(.16,.42,diffuseColor.b/max(diffuseColor.r,.001))
                    *smoothstep(1.60,1.85,trainLocal.y)*(1.-smoothstep(2.85,3.07,trainLocal.y))
                    *smoothstep(.82,1.06,abs(trainLocal.z));
          float glow=.42+.40*smoothstep(1.72,2.78,trainLocal.y);
          totalEmissiveRadiance+=vec3(.95,.43,.10)*glass*glow;
        `)
      }
    })
    return {object,materials}
  },[scene,kind])
  useEffect(()=>()=>materials.forEach(material=>material.dispose()),[materials])
  const bounds = useMemo(() => new Box3().setFromObject(object), [object])
  useEffect(() => report(kind, '就绪'), [kind, report])
  return <><primitive object={object} dispose={null}/>{debug && <><box3Helper args={[bounds, 0xffd68a]}/><axesHelper args={[2]}/></>}</>
}
function Placeholder({kind, report}: {kind: ModelKind, report: StatusHandler}) {
  const [x,y,z] = calibration.dimensionsXYZ[kind]
  useEffect(() => report(kind, '占位'), [kind, report])
  return <mesh position-y={kind === 'bridge' ? -0.25 : y/2}>
    <boxGeometry args={[x,kind === 'bridge' ? 0.5 : y,z]}/><meshStandardMaterial color="#e39860" wireframe/>
  </mesh>
}
export function Model({kind, debug, report}: {kind: ModelKind, debug: boolean, report: StatusHandler}) {
  return <ErrorBoundary fallback={<Placeholder kind={kind} report={report}/>}>
    <Suspense fallback={null}><Loaded kind={kind} debug={debug} report={report}/></Suspense>
  </ErrorBoundary>
}

