import {paletteGLSL} from '../Palette'
export const cloudNoise = `
float hash(vec2 p) {
  vec3 h=fract(p.xyx*vec3(.1031,.11369,.13787));
  h+=dot(h,h.yzx+19.19);
  return fract((h.x+h.y)*h.z);
}
float noise2(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);
}
float fb(vec2 p){
#ifdef CLOUD_LOW
  return noise2(p)*.65+noise2(p*2.12+3.)*.35;
#else
  return noise2(p)*.55+noise2(p*2.12+3.)*.29+noise2(p*4.07-2.)*.16;
#endif
}
`
export const farVertex=`
varying vec3 vLocal;
void main(){vLocal=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
`
export const farFragment=paletteGLSL+cloudNoise+`
varying vec3 vLocal;
uniform vec2 travel;
uniform float seed,density,softness,layer;
void main(){
  if(vLocal.y>22. || density<=0.)discard;
  vec2 p=vLocal.xz+vec2(seed*.12,seed*.07)-travel*(.28+.10*layer);
  float broad=fb(p*.024);
  float scallops=1.-abs(sin(p.x*.11+p.y*.065+3.*noise2(p*.065)));
  float crest=7.+broad*27.+scallops*2.8+fb(p*.24)*2.9;
  float y=vLocal.y+24.+(1.-density)*18.;
  float dist=crest-y;
  float feather=.18+softness*2.;
  float alpha=smoothstep(-feather,feather,dist)*smoothstep(.0,.19,density);
  if(alpha<.012)discard;
  float strata=dist+(fb(p*.06+vec2(y*.13,y*.17))-.5)*12.;
  vec3 edge=mix(sunlight,rim,broad);
  vec3 coral=mix(cloud,rim,.24-layer/50.);
  vec3 rose=mix(cloud,shadowColor,.35+layer/16.);
  vec3 c=mix(edge,coral,smoothstep(1.,3.8,strata));
  c=mix(c,rose,smoothstep(6.,9.,strata));
  c=mix(c,shadowColor,.70*smoothstep(15.,27.,strata));
  c=mix(c,mist,.10+.16*(1.-layer/8.));
  gl_FragColor=vec4(c,alpha);
  #include <colorspace_fragment>
}`
export const mistVertex=`
varying vec2 tex;
void main(){tex=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
`
export const mistFragment=paletteGLSL+cloudNoise+`
varying vec2 tex;
uniform vec2 mistTime; uniform float strength,seed;
void main(){
  vec2 uv=tex*2.-1.;
  float fade=1.-smoothstep(.36,1.,length(uv));
  float n=fb(vec2(uv.x*3.8-mistTime.x*.17,uv.y*2.+mistTime.x*.045)+seed);
  float alpha=fade*smoothstep(.23,.82,n)*strength*.83;
  if(alpha<.003)discard;
  gl_FragColor=vec4(mix(cloud,mist,n),alpha);
  #include <colorspace_fragment>
}`



