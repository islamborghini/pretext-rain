import { WAVE_COMPONENTS, WAVE_MAX_ACTIVE, WAVE_MIN_INTERVAL } from './config.js'

const waveVisuals = []
let lastSpawnTime = 0

// Pre-compute omega
const SCREEN_G = 2.0
const SCREEN_SIGMA_RHO = 800.0
const waveOmegas = WAVE_COMPONENTS.map(c => {
  const k = c.k
  return Math.sqrt(SCREEN_G * k + SCREEN_SIGMA_RHO * k * k * k)
})

// Only render rings for waves above this amplitude threshold
const VISUAL_AMPLITUDE_MIN = 0.3

export function spawnWaveVisual(x, y, now, amplitude) {
  if (waveVisuals.length >= WAVE_MAX_ACTIVE) return false
  if (now - lastSpawnTime < WAVE_MIN_INTERVAL) return false

  lastSpawnTime = now
  waveVisuals.push({ x, y, t: 0, amplitude })
  return true
}

export function updateWaveVisuals(dt) {
  for (let i = waveVisuals.length - 1; i >= 0; i--) {
    waveVisuals[i].t += dt
    const env = WAVE_COMPONENTS[0].amp * Math.exp(-WAVE_COMPONENTS[0].decay * waveVisuals[i].t)
    if (env * waveVisuals[i].amplitude < 0.1) {
      waveVisuals.splice(i, 1)
    }
  }
}

export function getWaveVisuals() {
  return waveVisuals
}

/**
 * Compute ring positions for rendering. Only for waves with enough amplitude
 * to be visually meaningful (skip tiny drizzle waves).
 */
export function getWaveRings(wave) {
  // Skip ring rendering for tiny impacts — they still affect text displacement
  if (wave.amplitude < VISUAL_AMPLITUDE_MIN) return null

  const rings = []
  for (let c = 0; c < WAVE_COMPONENTS.length; c++) {
    const comp = WAVE_COMPONENTS[c]
    const omega = waveOmegas[c]
    const radius = (omega / comp.k) * wave.t
    if (radius < 3) continue
    const envelope = comp.amp * Math.exp(-comp.decay * wave.t)
    if (envelope < 0.03) continue

    rings.push({
      radius,
      alpha: envelope * Math.min(wave.amplitude * 0.6, 1.2),
      lineWidth: 1.0 + comp.amp * 0.6,
    })
  }
  return rings
}
