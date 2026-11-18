// Generate compact exterior meshes, retaining the source UVs, embedded textures, units and axes.
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import {MeshoptSimplifier as simplifier} from 'meshoptimizer'
await simplifier.ready
simplifier.useExperimentalFeatures=true
await mkdir('assets/runtime',{recursive:true})
for(const [name,target] of [['bridge_module',18000],['train_locomotive',36000],['carriage',30000]]){
  const bytes=await readFile('assets/processed/blender/'+name+'.glb')
  const jsonSize=bytes.readUInt32LE(12)
  const j=JSON.parse(bytes.toString('utf8',20,20+jsonSize)),bin=bytes.subarray(28+jsonSize)
  const p=j.meshes[0].primitives[0]
  function array(id,T,components){
    const a=j.accessors[id],v=j.bufferViews[a.bufferView]
    if(v.byteStride && v.byteStride!==T.BYTES_PER_ELEMENT*components)throw Error('Unexpected interleaved attribute')
    return new T(bin.buffer,bin.byteOffset+(v.byteOffset||0)+(a.byteOffset||0),a.count*components)
  }
  const pos=array(p.attributes.POSITION,Float32Array,3),uv=array(p.attributes.TEXCOORD_0,Float32Array,2)
  const normal=array(p.attributes.NORMAL,Float32Array,3),old=array(p.indices,Uint32Array,1)
  const count=pos.length/3,attributes=new Float32Array(count*5),lock=new Uint8Array(count)
  const pa=j.accessors[p.attributes.POSITION]
  for(let i=0;i<count;i++){
    for(let k=0;k<3;k++){
      const v=pos[i*3+k]
      attributes[i*5+k]=normal[i*3+k]
      if(v===pa.min[k]||v===pa.max[k])lock[i]=1
    }
    attributes[i*5+3]=uv[i*2];attributes[i*5+4]=uv[i*2+1]
    if(name!=='bridge_module' && pos[i*3+1]<.025)lock[i]=1
  }
  const [indices,error]=simplifier.simplifyWithAttributes(old,pos,3,attributes,5,[.09,.09,.09,.3,.3],lock,target*3,.013)
  const [remap,used]=simplifier.compactMesh(indices)
  const parts=j.bufferViews.map(v=>bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength))
  for(const [id,data,dim] of [[p.attributes.POSITION,pos,3],[p.attributes.NORMAL,normal,3],[p.attributes.TEXCOORD_0,uv,2]]){
    const a=j.accessors[id],compact=new Float32Array(used*dim)
    for(let i=0;i<remap.length;i++)if(remap[i]!==0xffffffff){
      for(let k=0;k<dim;k++)compact[remap[i]*dim+k]=data[i*dim+k]
    }
    parts[a.bufferView]=Buffer.from(compact.buffer);a.count=used
    if(a.min || a.max){
      a.min=Array(dim).fill(Infinity);a.max=Array(dim).fill(-Infinity)
      for(let i=0;i<compact.length;i++){const k=i%dim;a.min[k]=Math.min(a.min[k],compact[i]);a.max[k]=Math.max(a.max[k],compact[i])}
    }
  }
  const ia=j.accessors[p.indices]
  const outIndices=used<=65535?Uint16Array.from(indices):indices
  ia.componentType=used<=65535?5123:5125
  ia.count=indices.length;ia.min=[0];ia.max=[used-1];parts[ia.bufferView]=Buffer.from(outIndices.buffer,outIndices.byteOffset,outIndices.byteLength)
  if(j.materials.some(m=>m.alphaMode && m.alphaMode!=='OPAQUE'))throw Error('Transparent textures require an alpha-preserving export')
  for(const image of j.images){
    const roughness=j.textures[j.materials[0].pbrMetallicRoughness.metallicRoughnessTexture.index].source===j.images.indexOf(image)
    const result=spawnSync('python',['scripts/encode-render-texture.py',roughness?'768':'1536'],{input:parts[image.bufferView],maxBuffer:16*1024*1024})
    if(result.status!==0)throw Error(result.stderr?.toString()||String(result.error))
    parts[image.bufferView]=result.stdout;image.mimeType='image/jpeg'
  }
  const chunks=[];let offset=0
  parts.forEach((part,i)=>{
    j.bufferViews[i].byteOffset=offset;j.bufferViews[i].byteLength=part.length
    const padding=(4-part.length%4)%4
    chunks.push(part,Buffer.alloc(padding));offset+=part.length+padding
  })
  j.buffers[0].byteLength=offset
  const raw=Buffer.from(JSON.stringify(j)),json=Buffer.concat([raw,Buffer.alloc((4-raw.length%4)%4,32)])
  const header=Buffer.alloc(20),binHeader=Buffer.alloc(8)
  header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+offset,8)
  header.writeUInt32LE(json.length,12);header.write('JSON',16);binHeader.writeUInt32LE(offset);binHeader.write('BIN',4)
  await writeFile('assets/runtime/'+name+'.glb',Buffer.concat([header,json,binHeader,...chunks]))
  console.log(name,old.length/3,'→',indices.length/3,'triangles;',used,'vertices; relative error',error.toFixed(5))
}
