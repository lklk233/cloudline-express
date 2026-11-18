import {useEffect,useMemo} from 'react'
import {Data3DTexture,DoubleSide,LinearFilter,RedFormat,RepeatWrapping,Vector2} from 'three'
import {randomFrom,trackFrame} from './layout'
import {useScene} from '../store'
import {usePalette,paletteGLSL} from '../Palette'

const vertex=`
varying vec3 world;
void main(){
  world=(modelMatrix*vec4(position,1.)).xyz;
  gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
}`
const fragment=paletteGLSL+`
precision highp sampler3D;
uniform sampler3D weather;
uniform mat4 projectionMatrix;
uniform vec2 travel;
uniform float seed,shadow,sun,density,scale;
varying vec3 world;
float noise3(vec3 p){return texture(weather,p/32.).r;}
float mass(vec3 p){
  vec3 q=p*vec3(.066,.115,.072);
  float broad=noise3(q*.45);
  float swell=noise3(q+1.7*broad);
  float folds=noise3(q*2.6+2.*swell);
  float crown=.38*broad+.42*swell+.15*folds+.05*noise3(q*6.1);
  return smoothstep(-.035,.09,crown-.59-p.y*.044+(density-.65)*.23);
}
void main(){
  if(density<=0.)discard;
  vec3 ray=normalize(world-cameraPosition);
  if(ray.y>=-.006)discard;
  float stride=min(24./-ray.y,190.)/float(STEPS);
  vec3 p=vec3((world.xz-4.*sin(travel*.085))/scale,0.).xzy;
  p+=vec3(seed*.23,8.,seed*.11);
  p+=ray*stride*.5;
  vec3 color=vec3(0.);
  float trans=1.;
  float depthSum=0.;
  for(int i=0;i<STEPS;i++,p+=ray*stride){
    float rho=mass(p);
    if(rho<.01)continue;
    float lightPath=.64*mass(p+vec3(-1.5,2.,-.7))+.36*mass(p+vec3(-3.4,4.,-1.8));
    float exposure=exp(-lightPath*(1.25+shadow*1.8));
    float skylight=smoothstep(-4.5,5.5,p.y);
    float facing=clamp(rho-mass(p+vec3(-1.9,.9,-1.4)),-.65,.65);
    float lit=clamp(sun*(.14+.44*skylight+.34*exposure+.32*facing-.38*lightPath),0.,1.);
    vec3 shade=mix(shadowColor,mist,.19);
    vec3 coral=mix(cloud,mist,.38);
    vec3 crest=mix(rim,cloud,.26);
    vec3 light=mix(mix(shade,coral,smoothstep(.09,.56,lit)),crest,smoothstep(.48,.91,lit));
    float opacity=1.-exp(-rho*stride*.65);
    depthSum+=trans*opacity*(float(i)+.5)*stride;
    color+=trans*opacity*light;
    trans*=1.-opacity;
    if(trans<.025)break;
  }
  float alpha=1.-trans;
  if(alpha<.005)discard;
  float haze=smoothstep(80.,230.,distance(cameraPosition,world))*.62;
  vec4 clip=projectionMatrix*viewMatrix*vec4(world+ray*(depthSum/alpha)*scale,1.);
  gl_FragDepth=clip.z/clip.w*.5+.5;
  float horizonFade=1.-smoothstep(145.,250.,distance(cameraPosition,world));
  gl_FragColor=vec4(mix(color/alpha,mist,haze),alpha*horizonFade*smoothstep(0.,.22,density));
  #include <colorspace_fragment>
}`

export function CloudBasin({travel,seed}:{travel:{value:Vector2},seed:number}){
  const s=useScene()
  const palette=usePalette()
  const weather=useMemo(()=>{
    const r=randomFrom(60219)
    const data=Uint8Array.from({length:32**3},()=>Math.floor(r()*256))
    const texture=new Data3DTexture(data,32,32,32)
    texture.format=RedFormat
    texture.minFilter=texture.magFilter=LinearFilter
    texture.wrapS=texture.wrapT=texture.wrapR=RepeatWrapping
    texture.needsUpdate=true
    return texture
  },[])
  useEffect(()=>()=>weather.dispose(),[weather])
  const uniforms=useMemo(()=>({...palette,travel,weather:{value:weather},seed:{value:seed},
    scale:{value:s.lowerCloudScale},shadow:{value:s.cloudShadowStrength},sun:{value:s.sunIntensity},density:{value:s.cloudDensity}}),
    [palette,travel,weather,seed,s.lowerCloudScale,s.cloudShadowStrength,s.sunIntensity,s.cloudDensity])
  const top=trackFrame.railY+Math.min(-2.1,-6.4+s.cloudHeight+s.lowerCloudHeight)
  return <mesh position={[trackFrame.x,top,trackFrame.z]} rotation-x={-Math.PI/2} renderOrder={-1}>
    <planeGeometry args={[620,560]}/>
    <shaderMaterial key={s.cloudQuality} defines={{STEPS:s.cloudQuality==='high'?40:23}} side={DoubleSide}
      uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} transparent depthWrite={false} toneMapped={false}/>
  </mesh>
}
