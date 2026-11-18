import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { calibration as c, consist } from '../src/config/calibration'
import { exteriorAssets } from '../src/config/assets'

// Decode POSITION from the audited single-primitive GLBs to check the rail contact strips.
function positions(kind: keyof typeof exteriorAssets) {
  const bytes = readFileSync(exteriorAssets[kind])
  const jsonSize = bytes.readUInt32LE(12)
  const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + jsonSize))
  const a = gltf.accessors[gltf.meshes[0].primitives[0].attributes.POSITION]
  expect(a.componentType).toBe(5126)
  const view = gltf.bufferViews[a.bufferView]
  const offset = 28 + jsonSize + (view.byteOffset ?? 0) + (a.byteOffset ?? 0)
  return { count: a.count as number, get(i:number, axis:number) {
    return bytes.readFloatLE(offset + i*(view.byteStride ?? 12) + axis*4)
  }}
}
for (const kind of ['locomotive','carriage'] as const) {
  it(kind + ' has wheel contact on both rail heads', () => {
    const mesh = positions(kind)
    const lowest = [Infinity, Infinity]
    for(let i=0;i<mesh.count;i++) {
      const z = mesh.get(i,2)
      if(Math.abs(Math.abs(z)-c.railOffset)>c.railWidth/2) continue
      const side = Number(z>0)
      lowest[side] = Math.min(lowest[side], mesh.get(i,1))
    }
    for(const y of lowest) expect(Math.abs(y-c.wheelBottom[kind])).toBeLessThan(.006)
  })
}
it('keeps consecutive bodies clear and within the calibrated track', () => {
  let previousRear: number | undefined
  for(const {kind,x} of consist) {
    const halfLength = c.dimensionsXYZ[kind][0]/2
    if(previousRear !== undefined) expect(previousRear - x - halfLength).toBeCloseTo(c.couplerGap,5)
    expect(x+halfLength).toBeLessThan(c.trackPoints[1][0])
    previousRear = x-halfLength
    expect(previousRear).toBeGreaterThan(c.trackPoints[0][0])
  }
})
