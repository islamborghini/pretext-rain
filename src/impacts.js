import { WAVE_COMPONENTS, WAVE_MAX_ACTIVE, WAVE_MIN_INTERVAL } from './config.js'

/**
 * Visual wave ring rendering data.
 * These track per-wave-source state for the renderer to draw expanding
 * concentric rings that match the actual physics (dispersion relation).
 */

const waveVisuals = []
let lastSpawnTime = 0

// Pre-compute omega (same as text-layout.js)
const SCREEN_G = 2.0
const SCREEN_SIGMA_RHO = 800.0
const waveOmegas = WAVE_COMPONENTS.map(c => {
  const k = c.k
  return Math.sqrt(SCREEN_G * k + SCREEN_SIGMA_RHO * k * k * k)
})

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
    // Check if all components are dead
    let alive = false
    for (let c = 0; c < WAVE_COMPONENTS.length; c++) {
      if (WAVE_COMPONENTS[c].amp * Math.exp(-WAVE_COMPONENTS[c].decay * waveVisuals[i].t) > 0.02) {
        alive = true
        break
      }
    }
    if (!alive) waveVisuals.splice(i, 1)
  }
}

export function getWaveVisuals() {
  return waveVisuals
}

/**
 * For the renderer: compute the ring radii and alphas for a given wave.
 * Each frequency component has a ring at a different radius (dispersion).
 * Returns array of { radius, alpha, lineWidth }.
 */
export function getWaveRings(wave) {
  const rings = []
  for (let c = 0; c < WAVE_COMPONENTS.length; c++) {
    const comp = WAVE_COMPONENTS[c]
    const omega = waveOmegas[c]
    // Ring radius = phase velocity × time = (ω/k) × t
    const phaseVelocity = omega / comp.k
    const radius = phaseVelocity * wave.t
    if (radius < 3) continue
    // Amplitude envelope
    const envelope = comp.amp * Math.exp(-comp.decay * wave.t)
    if (envelope < 0.02) continue

    rings.push({
      radius,
      alpha: envelope * Math.min(wave.amplitude, 1.5),
      lineWidth: 1.2 + comp.amp * 0.8, // thicker for dominant component
    })
  }
  return rings
}
