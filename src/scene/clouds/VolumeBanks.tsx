import {useEffect,useMemo,useRef} from 'react'
import {useFrame,useLoader} from '@react-three/fiber'
import {Mesh,BoxGeometry,Data3DTexture,FileLoader,LinearFilter,RedFormat,Vector2} from 'three'
import {gunzipSync} from 'three/examples/jsm/libs/fflate.module.js'
import brickUrl from '../../../assets/runtime/cloud-density.bin?url'
import {paletteGLSL,usePalette} from '../Palette'
import {useScene} from '../store'
import {beltLength,courseVariation,bankCount,cloudModelCount,createBackdropBanks,createBanks,createLowerBanks,safeHeight,worldPosition} from './layout'

const box=new BoxGeometry(2,2,2)
const vertex=`
uniform vec2 travel;
varying vec3 entry,eye,localLight; varying float beltFade;
void main(){
  vec3 drift=vec3(sin(travel.x*.085),0.,sin(travel.y*.085))*4.;
  mat4 inv=inverse(modelMatrix);
  eye=(inv*vec4(cameraPosition-drift,1.)).xyz;
  localLight=normalize(mat3(inv)*vec3(-.50,.58,-.86));
  beltFade=1.-smoothstep(166.,216.,abs(modelMatrix[3].x-(${headLocalX.toFixed(3)})));
  entry=position;
  gl_Position=projectionMatrix*viewMatrix*(modelMatrix*vec4(position,1.)+vec4(drift,0.));
}`
const fragment=paletteGLSL+`
precision highp sampler3D;
uniform mat4 modelMatrix;
uniform sampler3D bricks;
uniform float shadow,sun,softness; uniform bool lowerDeck,backgroundBank;
varying vec3 entry,eye,localLight; varying float beltFade;
float field(vec3 p){
  return texture(bricks,clamp(p*.5+.5,0.,1.)).r;
}
void main(){
  vec3 ray=normalize(entry-eye);
  vec3 exitT=(sign(ray)-entry)/(ray+vec3(.000001));
  float ds=min(exitT.x,min(exitT.y,exitT.z))/float(STEPS);
  vec3 p=entry+ray*ds*.5;
  vec3 color=vec3(0.);
  float transmission=1.;
  for(int i=0;i<STEPS;i++,p+=ray*ds){
    float rho=field(p);
    if(rho<.015)continue;
    float cover=1.-exp(-smoothstep(.025,.45,rho)*ds*mix(56.,22.,softness));
    float nearSun=field(p+localLight*.053);
    float occlusion=.46*nearSun+.35*field(p+localLight*.24)+.19*field(p+localLight*.48);
    float facing=clamp((rho-nearSun)*1.35,-.6,.8);
    float top=smoothstep(-.50,.53,p.y);
    float skylight=clamp(.5+rho-field(p+vec3(0.,.12,0.)),0.,1.);
    float direct=clamp((.23+.36*top+.72*facing+.27*skylight-.34*occlusion)*sun,0.,1.);
    if(lowerDeck) direct=clamp(direct+sun*(.22*facing-.13*occlusion-.08*(1.-top)),0.,1.);
    vec3 violet=mix(shadowColor,cloud,(.10+.24*skylight)*(1.-.65*shadow));
    vec3 base=mix(violet,cloud,smoothstep(.01,.45,direct));
    vec3 amber=mix(sunlight,rim,.30);
    vec3 light=mix(base,amber,smoothstep(.42,.57,direct));
    light=mix(light,mix(rim,sunlight,.28),smoothstep(.66,.78,direct));
    light=mix(mix(cloud,mist,.38),light,lowerDeck?.72:.80);
    if(lowerDeck) light=mix(light,cloud,.19*smoothstep(.32,.85,direct));
    float level=lowerDeck?smoothstep(-28.,-2.,(modelMatrix*vec4(p,1.)).y):top;
    float shade=.55+.52*direct;
    if(lowerDeck) light=paint_lower(light,level,shade);
    else if(backgroundBank) light=paint_backdrop(light,level,shade);
    else light=paint_bank(light,level,shade);
    color+=transmission*cover*light;
    transmission*=1.-cover;
    if(transmission<.018)break;
  }
  float alpha=1.-transmission;
  if(alpha<.008)discard;
  gl_FragColor=vec4(color/alpha,alpha*beltFade);
  #include <colorspace_fragment>
}`

import {headLocalX,repeatPosition,type Motion} from '../train/track'
export function VolumeBanks({travel,motion}:{motion:React.RefObject<Motion>,travel:{value:Vector2}}){
  const meshes=useRef<(Mesh|null)[]>([])
  const s=useScene()
  const palette=usePalette()
  const bytes=useLoader(FileLoader,brickUrl,loader=>loader.setResponseType('arraybuffer')) as ArrayBuffer
  const bricks=useMemo(()=>{
    const data=gunzipSync(new Uint8Array(bytes))
    const side=96, stride=side**3
    if(data.length!==stride*cloudModelCount)throw new Error('Unexpected cloud volume dimensions')
    return Array.from({length:cloudModelCount},(_,i)=>{
      const texture=new Data3DTexture(data.subarray(i*stride,(i+1)*stride),side,side,side)
      texture.format=RedFormat
      texture.minFilter=texture.magFilter=LinearFilter
      texture.needsUpdate=true
      return texture
    })
  },[bytes])
  useEffect(()=>()=>bricks.forEach(texture=>texture.dispose()),[bricks])
  const banks=useMemo(()=>createBanks(s.cloudSeed),[s.cloudSeed])
  const backdrop=useMemo(()=>createBackdropBanks(s.cloudSeed),[s.cloudSeed])
  const lower=useMemo(()=>createLowerBanks(s.cloudSeed),[s.cloudSeed])
  const defs=useMemo(()=>({STEPS:s.cloudQuality==='high'?72:36}),[s.cloudQuality])
  const uniforms=useMemo(()=>[0,1,2].flatMap(group=>bricks.map(texture=>({...palette,travel,bricks:{value:texture},lowerDeck:{value:group===2},
    backgroundBank:{value:group===1},sun:{value:s.sunIntensity},shadow:{value:s.cloudShadowStrength},softness:{value:s.cloudEdgeSoftness}}))),
    [palette,travel,bricks,s.sunIntensity,s.cloudShadowStrength,s.cloudEdgeSoftness])
  const count=bankCount(s.cloudDensity,s.cloudQuality)
  const lowerCount=Math.round(lower.length*s.cloudDensity*(s.cloudQuality==='low'?.66:1))
  const upper=[...banks.slice(0,count),...backdrop.slice(0,Math.round(count/8))]
  const active=[...upper,...lower.filter((_,i)=>((i*17)%lower.length)<lowerCount)]
  useFrame(()=>{
    active.forEach((b,i)=>{
      const mesh=meshes.current[i]
      if(mesh){
        const along=b.x-headLocalX-motion.current.distance
        const course=-Math.floor((along+beltLength/2)/beltLength)
        if(mesh.userData.course!==course || mesh.userData.bank!==b){
          mesh.userData.course=course
          mesh.userData.bank=b
          mesh.rotation.y=b.yaw+courseVariation(s.cloudSeed,i,course)*1.4
        }
        mesh.position.x=headLocalX+repeatPosition(b.x-headLocalX,motion.current.distance,beltLength)
      }
    })
  },-1)
  return <>{active.map((b,i)=>{
    const scale=i<upper.length?s.cloudScale:s.lowerCloudScale
    const [x,z]=worldPosition(b.x,b.z)
    const rx=b.rx*scale,ry=b.ry*scale,rz=b.rz*scale
    const reach=Math.hypot(rx,rz)
    const y=safeHeight(b.x,b.z,b.y+s.cloudHeight+(i>=upper.length?s.lowerCloudHeight:0),reach,ry,reach)
    return <mesh key={i} ref={node=>{meshes.current[i]=node}} geometry={box} position={[x,y,z]} scale={[rx,ry,rz]} rotation-y={b.yaw} frustumCulled={false}>
      <shaderMaterial key={s.cloudQuality} defines={defs} vertexShader={vertex} fragmentShader={fragment}
        uniforms={uniforms[b.variant+(i<count?0:i<upper.length?cloudModelCount:2*cloudModelCount)]} transparent depthWrite={false} toneMapped={false}/>
    </mesh>
  })}</>
}

