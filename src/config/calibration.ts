const span = 25
const bridgeCenters = [-3, -2, -1, 0, 1, 2, 3].map(index => index * span)
const trackEnd = bridgeCenters.at(-1)! + span / 2
const railTop = 0.24
export const calibration = {
  upAxis: 'Y', longitudinalAxis: 'X',
  dimensionsXYZ: {
    locomotive: [10.5, 3.56, 2.98], carriage: [10.8, 3.39, 2.92], bridge: [25, 9.308, 4.296],
  },
  bridgeCenters, span, railTop, railOffset: 1.10, railWidth: 0.14, sleeperHeight: 0.10,
  trackPoints: [[-trackEnd, railTop, 0], [trackEnd, railTop, 0]],
  wheelBottom: { locomotive: 0.005, carriage: 0.002 },
  headX: 20, couplerGap: 0.18,
} as const

export const consist = (['locomotive','carriage','carriage'] as const).map((kind, index) => {
  const { headX, couplerGap, dimensionsXYZ, wheelBottom } = calibration
  const firstSpacing = (dimensionsXYZ.locomotive[0] + dimensionsXYZ.carriage[0]) / 2 + couplerGap
  const x = index === 0 ? headX : headX - firstSpacing - (index - 1) * (dimensionsXYZ.carriage[0] + couplerGap)
  return { kind, x, y: railTop - wheelBottom[kind] }
})
