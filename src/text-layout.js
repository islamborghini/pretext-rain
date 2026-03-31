import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext'
import {
  FONT, LINE_HEIGHT, PARAGRAPH_TEXT,
  WAVE_COMPONENTS, WAVE_AMPLITUDE_BASE, WAVE_MAX_DISP,
  TEXT_LEAN_FACTOR,
} from './config.js'

/**
 * PHYSICS MODEL: Capillary-gravity wave superposition
 *
 * Instead of per-character spring-mass simulation, we use the analytical
 * solution to the 2D wave equation with the real dispersion relation:
 *
 *   ω² = g·k + (σ/ρ)·k³
 *
 * For each active wave source (raindrop impact), each character's displacement
 * is computed as the superposition of multiple frequency components:
 *
 *   displacement(r, t) = A₀/√(max(r,r_min)) × Σᵢ aᵢ·sin(kᵢ·r − ωᵢ·t) × exp(−dᵢ·t)
 *
 * Where:
 *   - 1/√r  = geometric spreading (2D cylindrical wave)
 *   - sin(kr − ωt) = propagating wave
 *   - exp(−d·t) = viscous damping (∝ ν·k² in real water)
 *   - Short wavelengths arrive first but decay fastest (capillary regime)
 *   - Long wavelengths arrive later but persist (gravity regime)
 *
 * This is both faster (pure evaluation, no iterative stepping) and
 * physically correct — it produces the characteristic multi-ring ripple
 * pattern seen in real water.
 */

let charParticles = []
let activeWaves = []  // { x, y, t, amplitude, alive }
let measureCtx = null
let globalTime = 0

// Pre-compute omega for each wave component from dispersion relation
// ω = sqrt(g·k + (σ/ρ)·k³) — in screen-space units tuned for visual speed
const SCREEN_G = 2.0      // effective gravity (screen space)
const SCREEN_SIGMA_RHO = 800.0  // effective σ/ρ (screen space) — makes short waves fast
const waveOmegas = WAVE_COMPONENTS.map(c => {
  const k = c.k
  return Math.sqrt(SCREEN_G * k + SCREEN_SIGMA_RHO * k * k * k)
})

function getMeasureCtx() {
  if (!measureCtx) {
    const c = document.createElement('canvas')
    measureCtx = c.getContext('2d')
  }
  measureCtx.font = FONT
  return measureCtx
}

/**
 * Build character particles from pretext layout.
 */
export function buildCharParticles(textArea) {
  const prepared = prepareWithSegments(PARAGRAPH_TEXT, FONT)
  const ctx = getMeasureCtx()

  const newParticles = []
  let cursor = { segmentIndex: 0, graphemeIndex: 0 }
  let lineTop = textArea.y

  while (lineTop + LINE_HEIGHT <= textArea.y + textArea.height) {
    const line = layoutNextLine(prepared, cursor, textArea.width)
    if (line === null) break

    let xPos = textArea.x
    const text = line.text

    for (let i = 0; i < text.length; i++) {
      const ch = text[i]
      const charW = ctx.measureText(ch).width

      newParticles.push({
        restX: xPos + charW / 2,
        restY: lineTop + LINE_HEIGHT / 2,
        dx: 0,
        dy: 0,
        char: ch,
        charWidth: charW,
      })

      xPos += charW
    }

    cursor = line.end
    lineTop += LINE_HEIGHT
  }

  charParticles = newParticles
}

/**
 * Register a new wave source from a raindrop impact.
 * amplitude is proportional to drop momentum (mass × velocity).
 */
export function addWave(x, y, dropMomentum) {
  activeWaves.push({
    x, y,
    t: 0,
    amplitude: WAVE_AMPLITUDE_BASE * dropMomentum,
    alive: true,
  })
}

/**
 * Evaluate all wave displacements for every character.
 * This is the hot path — pure math, no allocations.
 */
export function evaluateWaves(dt, wind) {
  globalTime += dt

  // Age waves and cull dead ones
  for (let w = activeWaves.length - 1; w >= 0; w--) {
    activeWaves[w].t += dt
    // Check if all components have decayed below threshold
    const wave = activeWaves[w]
    let maxContribution = 0
    for (let c = 0; c < WAVE_COMPONENTS.length; c++) {
      maxContribution += WAVE_COMPONENTS[c].amp * Math.exp(-WAVE_COMPONENTS[c].decay * wave.t)
    }
    if (maxContribution * wave.amplitude < 0.3) {
      activeWaves.splice(w, 1)
    }
  }

  const numWaves = activeWaves.length
  const numChars = charParticles.length
  const components = WAVE_COMPONENTS
  const numComp = components.length

  for (let i = 0; i < numChars; i++) {
    const p = charParticles[i]
    let totalDx = 0
    let totalDy = 0

    // Sum contributions from all active wave sources
    for (let w = 0; w < numWaves; w++) {
      const wave = activeWaves[w]
      const ex = p.restX - wave.x
      const ey = p.restY - wave.y
      const rSq = ex * ex + ey * ey
      if (rSq < 1) continue  // avoid singularity at impact center

      const r = Math.sqrt(rSq)
      const invSqrtR = 1 / Math.sqrt(Math.max(r, 8)) // geometric spreading, clamped

      // Unit direction (radial outward from impact)
      const nx = ex / r
      const ny = ey / r

      // Superpose all frequency components
      let radialDisp = 0
      for (let c = 0; c < numComp; c++) {
        const comp = components[c]
        const omega = waveOmegas[c]
        const phase = comp.k * r - omega * wave.t
        const envelope = comp.amp * Math.exp(-comp.decay * wave.t)
        radialDisp += envelope * Math.sin(phase)
      }

      radialDisp *= wave.amplitude * invSqrtR

      totalDx += radialDisp * nx
      totalDy += radialDisp * ny
    }

    // Add wind lean: gentle continuous displacement proportional to vertical position
    totalDx += wind * TEXT_LEAN_FACTOR * (p.restY - charParticles[0].restY) * 0.08

    // Clamp total displacement
    const dist = Math.sqrt(totalDx * totalDx + totalDy * totalDy)
    if (dist > WAVE_MAX_DISP) {
      const scale = WAVE_MAX_DISP / dist
      totalDx *= scale
      totalDy *= scale
    }

    p.dx = totalDx
    p.dy = totalDy
  }
}

export function getCharParticles() {
  return charParticles
}

export function getActiveWaves() {
  return activeWaves
}
