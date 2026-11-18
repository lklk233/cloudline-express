import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { exteriorAssets } from '../src/config/assets'
import { calibration } from '../src/config/calibration'

describe('exterior model inventory', () => {
  for (const [key, path] of Object.entries(exteriorAssets)) {
    it(key + ' matches its audited header and dimensions', () => {
      const bytes = readFileSync(path)
      expect(bytes.toString('ascii', 0, 4)).toBe('glTF')
      expect(bytes.readUInt32LE(4)).toBe(2)
      expect(bytes.readUInt32LE(8)).toBe(bytes.length)
      const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)))
      const position = gltf.accessors[gltf.meshes[0].primitives[0].attributes.POSITION]
      calibration.dimensionsXYZ[key as keyof typeof exteriorAssets].forEach((length, axis) => {
        expect(position.max[axis] - position.min[axis]).toBeCloseTo(length, 3)
      })
    })
  }
})
