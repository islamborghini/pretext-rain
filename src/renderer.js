import { rand } from './utils.js'
import {
  FONT, TEXT_COLOR,
  BG_TOP, BG_MID, BG_BOT,
  RAIN_COLOR_R, RAIN_COLOR_G, RAIN_COLOR_B,
  FOG_COUNT,
} from './config.js'
import { getWaveRings } from './impacts.js'

// ── Cached off-screen assets ─────────────────────────────────────
let bgCanvas = null
let vignetteCanvas = null
let cachedW = 0
let cachedH = 0

let fogParticles = []

const DISP_THRESHOLD = 0.5
const TWO_PI = Math.PI * 2

export function initFog(canvasW, canvasH) {
  fogParticles = []
  for (let i = 0; i < FOG_COUNT; i++) {
    fogParticles.push({
      x: rand(0, canvasW),
      y: rand(0, canvasH),
      radius: rand(80, 220),
      opacity: rand(0.008, 0.02),
      vx: rand(-8, 8),
      vy: rand(-3, 3),
    })
  }
}

function ensureStaticCanvases(w, h) {
  if (cachedW === w && cachedH === h) return
  cachedW = w
  cachedH = h

  bgCanvas = new OffscreenCanvas(w, h)
  const bgCtx = bgCanvas.getContext('2d')
  const grad = bgCtx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, BG_TOP)
  grad.addColorStop(0.45, BG_MID)
  grad.addColorStop(1, BG_BOT)
  bgCtx.fillStyle = grad
  bgCtx.fillRect(0, 0, w, h)

  vignetteCanvas = new OffscreenCanvas(w, h)
  const vCtx = vignetteCanvas.getContext('2d')
  const vg = vCtx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.85)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(0,0,0,0.35)')
  vCtx.fillStyle = vg
  vCtx.fillRect(0, 0, w, h)
}

function updateFog(dt, canvasW, canvasH, wind) {
  for (const f of fogParticles) {
    f.x += (f.vx + wind * 15) * dt
    f.y += f.vy * dt
    if (f.x > canvasW + f.radius) f.x = -f.radius
    if (f.x < -f.radius) f.x = canvasW + f.radius
    if (f.y > canvasH + f.radius) f.y = -f.radius
    if (f.y < -f.radius) f.y = canvasH + f.radius
  }
}

// ── Main render ──────────────────────────────────────────────────
export function render(ctx, canvasW, canvasH, dpr, charParticles, droplets, splashes, waveVisuals, wind, dt) {
  ctx.save()
  ctx.scale(dpr, dpr)

  ensureStaticCanvases(canvasW, canvasH)

  ctx.drawImage(bgCanvas, 0, 0)

  updateFog(dt, canvasW, canvasH, wind)
  drawFog(ctx)

  // Dispersive wave rings (under text)
  drawWaveRings(ctx, waveVisuals)

  drawCharacters(ctx, charParticles, wind)

  // Water sheen over active wave zones
  drawWaterSheen(ctx, waveVisuals)

  drawRain(ctx, droplets)
  drawSplashes(ctx, splashes)

  ctx.drawImage(vignetteCanvas, 0, 0)

  ctx.restore()
}

// ── Fog ──────────────────────────────────────────────────────────
function drawFog(ctx) {
  ctx.fillStyle = 'rgb(150, 170, 200)'
  for (const f of fogParticles) {
    ctx.globalAlpha = f.opacity
    ctx.beginPath()
    ctx.arc(f.x, f.y, f.radius, 0, TWO_PI)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

// ── Dispersive wave rings ────────────────────────────────────────
// Each wave source emits multiple rings at different radii — short-wavelength
// rings travel faster (capillary), long-wavelength rings travel slower (gravity).
// This is the real dispersion pattern you see in water.
function drawWaveRings(ctx, waveVisuals) {
  if (waveVisuals.length === 0) return

  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'

  for (const wave of waveVisuals) {
    const rings = getWaveRings(wave)
    if (!rings) continue

    for (const ring of rings) {
      // Outer glow ring
      ctx.globalAlpha = ring.alpha * 0.4
      ctx.strokeStyle = 'rgb(130,185,255)'
      ctx.lineWidth = ring.lineWidth + 1.5
      ctx.beginPath()
      ctx.arc(wave.x, wave.y, ring.radius, 0, TWO_PI)
      ctx.stroke()

      // Sharp inner ring
      ctx.globalAlpha = ring.alpha * 0.65
      ctx.strokeStyle = 'rgb(170,210,255)'
      ctx.lineWidth = ring.lineWidth * 0.6
      ctx.beginPath()
      ctx.arc(wave.x, wave.y, ring.radius, 0, TWO_PI)
      ctx.stroke()
    }

    // Impact center glow (fades quickly)
    const centerAlpha = Math.exp(-wave.t * 3) * Math.min(wave.amplitude, 1)
    if (centerAlpha > 0.03) {
      ctx.globalAlpha = centerAlpha * 0.35
      ctx.fillStyle = 'rgb(200,225,255)'
      ctx.beginPath()
      ctx.arc(wave.x, wave.y, 5 + wave.t * 8, 0, TWO_PI)
      ctx.fill()
    }
  }

  ctx.globalAlpha = 1
}

// Color buckets for displaced characters (computed once)
const COLOR_BUCKETS = 5
const dispColors = []
for (let b = 0; b < COLOR_BUCKETS; b++) {
  const t = b / (COLOR_BUCKETS - 1)
  const r = Math.round(220 - t * 50)
  const g = Math.round(215 - t * 15)
  const blue = Math.round(205 + t * 50)
  const alpha = (1 - t * 0.4) * 0.95
  dispColors.push(`rgba(${r},${g},${blue},${alpha.toFixed(2)})`)
}

// ── Characters: single pass ──────────────────────────────────────
function drawCharacters(ctx, charParticles, wind) {
  ctx.font = FONT
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.shadowBlur = 0

  let lastStyle = ''
  const restStyle = TEXT_COLOR

  for (let i = 0; i < charParticles.length; i++) {
    const p = charParticles[i]
    if (p.char === ' ') continue

    const dispSq = p.dx * p.dx + p.dy * p.dy

    if (dispSq < DISP_THRESHOLD) {
      if (lastStyle !== restStyle) { ctx.fillStyle = restStyle; lastStyle = restStyle }
      ctx.fillText(p.char, p.restX, p.restY)
    } else {
      const bucket = Math.min((dispSq / 225) | 0, COLOR_BUCKETS - 1) // 225 = 15²
      const style = dispColors[bucket]
      if (lastStyle !== style) { ctx.fillStyle = style; lastStyle = style }
      ctx.fillText(p.char, p.restX + p.dx, p.restY + p.dy)
    }
  }
}

// ── Rain ─────────────────────────────────────────────────────────
function drawRain(ctx, droplets) {
  ctx.lineCap = 'round'
  ctx.shadowBlur = 0

  // Batch by width class for fewer state changes
  const thin = []
  const med = []
  const thick = []
  for (const d of droplets) {
    if (d.width < 1.0) thin.push(d)
    else if (d.width < 1.4) med.push(d)
    else thick.push(d)
  }

  const groups = [
    { list: thin,  w: 0.8, alpha: 0.22 },
    { list: med,   w: 1.1, alpha: 0.30 },
    { list: thick, w: 1.5, alpha: 0.38 },
  ]

  for (const g of groups) {
    if (g.list.length === 0) continue
    ctx.lineWidth = g.w
    ctx.strokeStyle = `rgba(${RAIN_COLOR_R},${RAIN_COLOR_G},${RAIN_COLOR_B},${g.alpha})`
    ctx.beginPath()
    for (const d of g.list) {
      const windAngleX = d.vx * 0.018
      ctx.moveTo(d.x, d.y)
      ctx.lineTo(d.x - windAngleX, d.y - d.length)
    }
    ctx.stroke()
  }
}

// ── Splashes ─────────────────────────────────────────────────────
function drawSplashes(ctx, splashes) {
  if (splashes.length === 0) return
  ctx.fillStyle = 'rgb(200,225,255)'
  for (const s of splashes) {
    const t = s.life / s.maxLife
    ctx.globalAlpha = t * 0.7
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.radius * (0.4 + t * 0.6), 0, TWO_PI)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

// ── Water sheen ──────────────────────────────────────────────────
function drawWaterSheen(ctx, waveVisuals) {
  ctx.fillStyle = 'rgb(160,200,255)'
  for (const wave of waveVisuals) {
    const a = Math.exp(-wave.t * 1.5) * 0.04 * Math.min(wave.amplitude, 1.5)
    if (a < 0.005) continue
    const r = wave.t * 60 + 20
    ctx.globalAlpha = a
    ctx.beginPath()
    ctx.arc(wave.x, wave.y, r, 0, TWO_PI)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}
