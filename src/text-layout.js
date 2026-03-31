import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext'
import {
  FONT, LINE_HEIGHT, PARAGRAPH_TEXT,
  WAVE_COMPONENTS, WAVE_AMPLITUDE_BASE, WAVE_MAX_DISP,
  WAVE_INFLUENCE_RADIUS, TEXT_LEAN_FACTOR,
  CLICK_DROP_FORCE, CLICK_DROP_RADIUS, CLICK_DROP_SPEED, CLICK_DROP_BAND, CLICK_DROP_LIFE,
} from './config.js'

let charParticles = []
let activeWaves = []
let activeDrops = []
let measureCtx = null

const SCREEN_G = 2.0
const SCREEN_SIGMA_RHO = 800.0
const numComp = WAVE_COMPONENTS.length

// Flat typed arrays for inner loop
const comp_k = new Float64Array(numComp)
const comp_omega = new Float64Array(numComp)
for (let c = 0; c < numComp; c++) {
  const wc = WAVE_COMPONENTS[c]
  comp_k[c] = wc.k
  comp_omega[c] = Math.sqrt(SCREEN_G * wc.k + SCREEN_SIGMA_RHO * wc.k * wc.k * wc.k)
}

const INFLUENCE_SQ = WAVE_INFLUENCE_RADIUS * WAVE_INFLUENCE_RADIUS
const MAX_DISP_SQ = WAVE_MAX_DISP * WAVE_MAX_DISP

// Per-wave pre-computed envelopes (reused each frame, avoids alloc)
// Layout: [wave0_env0, wave0_env1, ..., wave0_envN, wave1_env0, ...]
let envBuf = new Float64Array(0)

/**
 * Fast sin approximation (Bhaskara-style, max error ~0.1%).
 * Maps x into [-PI, PI] then uses 5th-order polynomial.
 */
const PI = Math.PI
const TWO_PI = PI * 2
const INV_TWO_PI = 1 / TWO_PI
function fastSin(x) {
  // Reduce to [-PI, PI]
  x = x - TWO_PI * Math.floor(x * INV_TWO_PI + 0.5)
  // Horner form of sin approximation: x(1 - x²/6(1 - x²/20(1 - x²/42)))
  const x2 = x * x
  return x * (1 - x2 * (1.0 / 6 - x2 * (1.0 / 120 - x2 * (1.0 / 5040))))
}

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
        vx: 0,
        vy: 0,
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

export function addClickDrop(x, y, strength = 1) {
  activeDrops.push({
    x, y,
    t: 0,
    strength,
  })
}

export function evaluateWaves(dt, wind) {
  // Age and cull
  for (let w = activeWaves.length - 1; w >= 0; w--) {
    activeWaves[w].t += dt
    const wave = activeWaves[w]
    // Cull based on strongest (slowest-decaying) component
    const maxEnv = WAVE_COMPONENTS[0].amp * Math.exp(-WAVE_COMPONENTS[0].decay * wave.t) * wave.amplitude
    if (maxEnv < 0.15) {
      activeWaves.splice(w, 1)
    }
  }

  for (let i = activeDrops.length - 1; i >= 0; i--) {
    activeDrops[i].t += dt
    if (activeDrops[i].t > CLICK_DROP_LIFE) {
      activeDrops.splice(i, 1)
    }
  }

  const numWaves = activeWaves.length
  const numDrops = activeDrops.length
  const numChars = charParticles.length
  if (numChars === 0) return

  const refY = charParticles[0].restY
  const windLean = wind * TEXT_LEAN_FACTOR * 0.08
  const springForce = 300
  const damping = Math.exp(-18 * dt)

  // ── Pre-compute envelopes for all waves (outside char loop) ────
  // This eliminates numChars × numComp Math.exp calls per frame.
  const envNeeded = numWaves * numComp
  if (envBuf.length < envNeeded) {
    envBuf = new Float64Array(envNeeded)
  }
  for (let w = 0; w < numWaves; w++) {
    const wt = activeWaves[w].t
    const base = w * numComp
    for (let c = 0; c < numComp; c++) {
      envBuf[base + c] = WAVE_COMPONENTS[c].amp * Math.exp(-WAVE_COMPONENTS[c].decay * wt)
    }
  }

  // ── Main character loop ────────────────────────────────────────
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

      if (rSq > INFLUENCE_SQ || rSq < 1) continue

      const r = Math.sqrt(rSq)
      // Combined: amplitude / sqrt(r) and direction in one pass
      const invR = 1 / r
      const invSqrtR = 1 / Math.sqrt(r < 8 ? 8 : r)
      const nx = ex * invR
      const ny = ey * invR
      const wt = wave.t

      // Component superposition with pre-computed envelopes + fast sin
      let radialDisp = 0
      const base = w * numComp
      for (let c = 0; c < numComp; c++) {
        radialDisp += envBuf[base + c] * fastSin(comp_k[c] * r - comp_omega[c] * wt)
      }

      const disp = radialDisp * wave.amplitude * invSqrtR
      totalDx += disp * nx
      totalDy += disp * ny
    }

    for (let d = 0; d < numDrops; d++) {
      const drop = activeDrops[d]
      const ex = px - drop.x
      const ey = py - drop.y
      const rSq = ex * ex + ey * ey
      if (rSq < 1 || rSq > CLICK_DROP_RADIUS * CLICK_DROP_RADIUS) continue

      const r = Math.sqrt(rSq)
      const invR = 1 / r
      const nx = ex * invR
      const ny = ey * invR
      const frontRadius = drop.t * CLICK_DROP_SPEED
      const bandDelta = r - frontRadius
      const band = Math.exp(-(bandDelta * bandDelta) / (2 * CLICK_DROP_BAND * CLICK_DROP_BAND))
      const body = Math.max(0, 1 - r / CLICK_DROP_RADIUS)
      const decay = Math.exp(-drop.t * 2.6)
      const disp = CLICK_DROP_FORCE * drop.strength * decay * (band * 1.4 + body * body * 0.55)

      totalDx += disp * nx
      totalDy += disp * ny
    }

    totalDx += windLean * (py - refY)

    // Clamp (avoid sqrt when possible)
    const distSq = totalDx * totalDx + totalDy * totalDy
    if (distSq > MAX_DISP_SQ) {
      const scale = WAVE_MAX_DISP / Math.sqrt(distSq)
      totalDx *= scale
      totalDy *= scale
    }

    // Critically damped spring motion feels smoother than simple easing
    p.vx = (p.vx + (totalDx - p.dx) * springForce * dt) * damping
    p.vy = (p.vy + (totalDy - p.dy) * springForce * dt) * damping
    p.dx += p.vx * dt
    p.dy += p.vy * dt
  }
}

export function getCharParticles() {
  return charParticles
}

export function getActiveWaves() {
  return activeWaves
}
