import {useEffect,useMemo,useRef} from 'react'
import {useFrame,useThree} from '@react-three/fiber'
import {PerspectiveCamera,Vector3} from 'three'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import {departure,track,vehicles} from './train/track'
import {useScene} from './store'

const cruise=[
  [-22,10,42,40],[12,6,28,43],[30,17,50,36],[-8,21,60,34],
]
export function CameraRig(){
  const {camera,gl,size,invalidate}=useThree()
  const {shot,inspection,reducedMotion}=useScene()
  useEffect(()=>{invalidate()},[invalidate,shot,inspection,reducedMotion,size.width,size.height])
  const docked=useScene(s=>s.panelOpen && !s.uiHidden)
  useEffect(()=>{
    if(!(camera instanceof PerspectiveCamera))return
    if(docked && size.width>760)camera.setViewOffset(size.width,size.height,150,0,size.width,size.height)
    else if(docked)camera.setViewOffset(size.width,size.height,0,size.height*.255,size.width,size.height)
    else camera.clearViewOffset()
    invalidate()
  },[camera,size.width,size.height,docked,invalidate])
  const orbit=useRef<OrbitControls|null>(null)
  const proxy=useMemo(()=>new PerspectiveCamera(38),[])
  const space=useMemo(()=>({head:new Vector3(),direction:new Vector3(),side:new Vector3(),
    focus:new Vector3(),eye:new Vector3(),look:new Vector3(),offset:new Vector3()}),[])
  const initialized=useRef(false),clock=useRef(0)
  useEffect(()=>{
    if(shot!=='orbit' || inspection)return
    proxy.position.set(-24,13,42)
    const control=new OrbitControls(proxy,gl.domElement)
    control.enablePan=false
    control.enableDamping=true
    control.dampingFactor=.12
    control.minDistance=23
    control.maxDistance=85
    control.minAzimuthAngle=-1.13
    control.maxAzimuthAngle=1.13
    control.minPolarAngle=.65
    control.maxPolarAngle=1.43
    control.update()
    orbit.current=control
    control.addEventListener('change',invalidateFrame)
    function invalidateFrame(){invalidate()}
    invalidate()
    return ()=>{control.removeEventListener('change',invalidateFrame);control.dispose();orbit.current=null}
  },[shot,inspection,proxy,gl,invalidate])
  useEffect(()=>{
    const wake=()=>invalidate()
    document.addEventListener('visibilitychange',wake)
    return ()=>document.removeEventListener('visibilitychange',wake)
  },[invalidate])
  useFrame((_,delta)=>{
    if(!(camera instanceof PerspectiveCamera))return
    const dt=Math.min(.12,delta)
    const {head,direction,side,focus,eye,look,offset}=space
    track.sample(departure,head,direction)
    side.set(-direction.z,0,direction.x).normalize()
    const fit=Math.max(1,1.55/(size.width/size.height))
    focus.copy(head).addScaledVector(direction,-vehicles[2].offset/2)
    let fov=35
    if(inspection==='rail'){
      focus.copy(head);focus.y+=.65
      offset.set(4.2,1.08,12);fov=34
    }else if(inspection==='cloud'){
      focus.y+=5.5;offset.set(-60,17,38)
    }else if(shot==='orbit'){
      orbit.current?.update(dt)
      focus.y+=1
      offset.copy(proxy.position);fov=38
    }else if(shot==='follow'){
      focus.addScaledVector(direction,4);focus.y+=1.4
      offset.set(-16,5.8,25);fov=42
    }else if(shot==='cinematic'){
      if(!reducedMotion)clock.current+=dt/7
      const index=Math.floor(clock.current)%cruise.length
      const a=cruise[index],b=cruise[(index+1)%cruise.length]
      const t=clock.current%1,blend=t*t*(3-2*t)
      offset.set(a[0]+(b[0]-a[0])*blend,a[1]+(b[1]-a[1])*blend,a[2]+(b[2]-a[2])*blend)
      fov=a[3]+(b[3]-a[3])*blend
      focus.y+=1.7
    }else{
      focus.x*=.85;focus.z*=.85;focus.y+=5.5
      offset.set(19.7,9.5,73)
    }
    eye.copy(focus).addScaledVector(direction,offset.x*fit).addScaledVector(side,offset.z*fit)
    eye.y+=offset.y*fit
    const alpha=initialized.current ? 1-Math.exp(-(reducedMotion?12:4.5)*dt) : 1
    initialized.current=true
    camera.position.lerp(eye,alpha)
    look.lerp(focus,alpha)
    camera.lookAt(look)
    const next=camera.fov+(fov-camera.fov)*alpha
    if(next!==camera.fov){camera.fov=next;camera.updateProjectionMatrix()}
    if(camera.position.distanceToSquared(eye)>.00002 || look.distanceToSquared(focus)>.00002 ||
      Math.abs(camera.fov-fov)>.001 || (shot==='cinematic' && !inspection && !reducedMotion))invalidate()
  },-1)
  return null
}


