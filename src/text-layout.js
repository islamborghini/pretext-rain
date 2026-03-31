import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext'
import {
  FONT, LINE_HEIGHT, PARAGRAPH_TEXT,
  WAVE_COMPONENTS, WAVE_AMPLITUDE_BASE, WAVE_MAX_DISP,
  WAVE_INFLUENCE_RADIUS, TEXT_LEAN_FACTOR,
} from './config.js'

let charParticles = []
let activeWaves = []
let measureCtx = null

// Pre-compute omega per component: ω = sqrt(g·k + (σ/ρ)·k³)
const SCREEN_G = 2.0
const SCREEN_SIGMA_RHO = 800.0
const numComp = WAVE_COMPONENTS.length

// Pre-compute into flat arrays for tight inner loop
const comp_k = new Float64Array(numComp)
const comp_amp = new Float64Array(numComp)
const comp_decay = new Float64Array(numComp)
const comp_omega = new Float64Array(numComp)
for (let c = 0; c < numComp; c++) {
  const wc = WAVE_COMPONENTS[c]
  comp_k[c] = wc.k
  comp_amp[c] = wc.amp
  comp_decay[c] = wc.decay
  comp_omega[c] = Math.sqrt(SCREEN_G * wc.k + SCREEN_SIGMA_RHO * wc.k * wc.k * wc.k)
}

const INFLUENCE_SQ = WAVE_INFLUENCE_RADIUS * WAVE_INFLUENCE_RADIUS

function getMeasureCtx() {
  if (!measureCtx) {
    const c = document.createElement('canvas')
    measureCtx = c.getContext('2d')
  }
  measureCtx.font = FONT
  return measureCtx
}

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

export function addWave(x, y, dropMomentum) {
  activeWaves.push({
    x, y,
    t: 0,
    amplitude: WAVE_AMPLITUDE_BASE * dropMomentum,
  })
}

/**
 * Evaluate wave displacements. Optimized hot path:
 * - Flat typed arrays for component data (no property lookups)
 * - Distance² early-out per wave (skip chars beyond influence radius)
 * - Aggressive wave culling (low amplitude → remove)
 */
export function evaluateWaves(dt, wind) {
  // Age and cull waves
  for (let w = activeWaves.length - 1; w >= 0; w--) {
    const wave = activeWaves[w]
    wave.t += dt
    // Fast cull: check if strongest component is below threshold
    const maxEnv = comp_amp[0] * Math.exp(-comp_decay[0] * wave.t) * wave.amplitude
    if (maxEnv < 0.2) {
      activeWaves.splice(w, 1)
    }
  }

  const numWaves = activeWaves.length
  const numChars = charParticles.length
  const smoothing = 1 - Math.exp(-10 * dt)

  // Wind lean reference Y
  const refY = numChars > 0 ? charParticles[0].restY : 0
  const windLean = wind * TEXT_LEAN_FACTOR * 0.08

  for (let i = 0; i < numChars; i++) {
    const p = charParticles[i]
    let totalDx = 0
    let totalDy = 0

    const px = p.restX
    const py = p.restY

    for (let w = 0; w < numWaves; w++) {
      const wave = activeWaves[w]
      const ex = px - wave.x
      const ey = py - wave.y
      const rSq = ex * ex + ey * ey

      // Early-out: skip if beyond influence radius
      if (rSq > INFLUENCE_SQ || rSq < 1) continue

      const r = Math.sqrt(rSq)
      const invSqrtR = 1 / Math.sqrt(r < 8 ? 8 : r)
      const nx = ex / r
      const ny = ey / r
      const wt = wave.t

      // Inline component superposition — no function calls
      let radialDisp = 0
      for (let c = 0; c < numComp; c++) {
        radialDisp += comp_amp[c] * Math.exp(-comp_decay[c] * wt) * Math.sin(comp_k[c] * r - comp_omega[c] * wt)
      }

      radialDisp *= wave.amplitude * invSqrtR

      totalDx += radialDisp * nx
      totalDy += radialDisp * ny
    }

    // Wind lean
    totalDx += windLean * (py - refY)

    // Clamp
    const distSq = totalDx * totalDx + totalDy * totalDy
    if (distSq > WAVE_MAX_DISP * WAVE_MAX_DISP) {
      const scale = WAVE_MAX_DISP / Math.sqrt(distSq)
      totalDx *= scale
      totalDy *= scale
    }

    // Temporal smoothing
    p.dx += (totalDx - p.dx) * smoothing
    p.dy += (totalDy - p.dy) * smoothing
  }
}

export function getCharParticles() {
  return charParticles
}

export function getActiveWaves() {
  return activeWaves
}
