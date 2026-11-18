import {usePalette,paletteGLSL} from './Palette'
import {useScene} from './store'
import { BackSide, Vector3 } from 'three'

export const sunDirection = new Vector3(-0.50, 0.045, -0.86).normalize()

const vertex = `
varying vec3 skyRay;
void main() {
  skyRay = position;
  vec4 view = mat4(mat3(viewMatrix)) * vec4(position,1.);
  gl_Position = projectionMatrix * view;
  gl_Position.z = gl_Position.w;
}`
const fragment = paletteGLSL+`
varying vec3 skyRay;
uniform vec3 sunDirection; uniform float intensity;
void main() {
  vec3 d = normalize(skyRay);
  float h = d.y;
  vec3 lower=shadowColor;

  vec3 gradient = mix(lower,horizon,smoothstep(-.42,.015,h));
  gradient = mix(gradient,sky,smoothstep(.006,.145,h));
  gradient = mix(gradient,sky*.65,smoothstep(.15,.45,h));
  gradient=paint_skyBand(gradient,smoothstep(.006,.145,h),1.);
  float haze=1.-smoothstep(.003,.045,abs(h-.006));
  gradient=mix(gradient,paint_vista(gradient,haze,1.),haze);
  float angle = distance(d,sunDirection);
  gradient = mix(gradient,sunlight,min(1.,.80*intensity)*exp(-angle*angle*15.));
  gradient += intensity*sunlight*.28*exp(-angle*angle*200.);
  gradient = mix(gradient,vec3(1.,.93,.72),1.-smoothstep(.029,.032,angle));
  gl_FragColor = vec4(gradient,1.);
  #include <colorspace_fragment>
}`
export function Sky() {
  const palette=usePalette()
  const intensity=useScene(s=>s.sunIntensity)
  return <mesh renderOrder={-100} frustumCulled={false}>
    <sphereGeometry args={[1,48,24]}/><shaderMaterial side={BackSide} depthWrite={false} depthTest={false}
      uniforms={{...palette,sunDirection:{value:sunDirection},intensity:{value:intensity}}} vertexShader={vertex} fragmentShader={fragment} toneMapped={false}/>
  </mesh>
}


