import { rand } from './utils.js'
import {
  FONT, TEXT_COLOR, TEXT_SKEW_FACTOR,
  BG_TOP, BG_MID, BG_BOT,
  RAIN_COLOR_R, RAIN_COLOR_G, RAIN_COLOR_B,
  FOG_COUNT,
} from './config.js'

// ── Cached off-screen assets (created once) ──────────────────────
let bgCanvas = null      // background gradient
let vignetteCanvas = null // vignette overlay
let cachedW = 0
let cachedH = 0

// Fog particles
let fogParticles = []

// Displacement threshold: characters below this are "at rest"
const DISP_THRESHOLD = 0.5

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

  // Background
  bgCanvas = new OffscreenCanvas(w, h)
  const bgCtx = bgCanvas.getContext('2d')
  const grad = bgCtx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, BG_TOP)
  grad.addColorStop(0.45, BG_MID)
  grad.addColorStop(1, BG_BOT)
  bgCtx.fillStyle = grad
  bgCtx.fillRect(0, 0, w, h)

  // Vignette
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
export function render(ctx, canvasW, canvasH, dpr, charParticles, droplets, splashes, impacts, wind, dt) {
  ctx.save()
  ctx.scale(dpr, dpr)

  ensureStaticCanvases(canvasW, canvasH)

  // 1. Background (blit cached)
  ctx.drawImage(bgCanvas, 0, 0)

  // 2. Fog — simplified: single semi-transparent circles, no gradients
  updateFog(dt, canvasW, canvasH, wind)
  drawFog(ctx)

  // 3. Impact rings (few objects, ok to be fancy)
  drawImpactRings(ctx, impacts)

  // 4. Characters — batched by displacement state
  drawCharacters(ctx, charParticles, wind)

  // 5. Water sheen
  drawWaterSheen(ctx, impacts)

  // 6. Rain — single batch, no per-droplet shadows
  drawRain(ctx, droplets)

  // 7. Splashes — simple circles, no shadows
  drawSplashes(ctx, splashes)

  // 8. Vignette (blit cached)
  ctx.drawImage(vignetteCanvas, 0, 0)

  ctx.restore()
}

// ── Fog: simple filled circles with globalAlpha ──────────────────
function drawFog(ctx) {
  ctx.fillStyle = 'rgb(150, 170, 200)'
  for (const f of fogParticles) {
    ctx.globalAlpha = f.opacity
    ctx.beginPath()
    ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

// ── Impact rings: max 8 active, fine to use a bit of shadow ─────
function drawImpactRings(ctx, impacts) {
  if (impacts.length === 0) return

  ctx.shadowBlur = 12
  ctx.lineWidth = 1.8

  for (const imp of impacts) {
    const a = imp.alpha
    ctx.shadowColor = `rgba(100,160,255,${(a * 0.25).toFixed(2)})`
    ctx.strokeStyle = `rgba(140,190,255,${(a * 0.4).toFixed(2)})`
    ctx.beginPath()
    ctx.arc(imp.x, imp.y, imp.radius, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Inner rings — no shadow
  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'

  for (const imp of impacts) {
    const a = imp.alpha
    if (imp.radius > 10) {
      ctx.strokeStyle = `rgba(160,200,255,${(a * 0.2).toFixed(2)})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(imp.x, imp.y, imp.radius * 0.6, 0, Math.PI * 2)
      ctx.stroke()
    }
    if (imp.radius > 20) {
      ctx.strokeStyle = `rgba(180,215,255,${(a * 0.12).toFixed(2)})`
      ctx.lineWidth = 0.7
      ctx.beginPath()
      ctx.arc(imp.x, imp.y, imp.radius * 0.3, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
}

// ── Characters: batch at-rest chars in one pass, displaced separately ──
function drawCharacters(ctx, charParticles, wind) {
  ctx.font = FONT
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'

  // Pass 1: at-rest characters — single fillStyle, no transforms
  ctx.fillStyle = TEXT_COLOR
  for (let i = 0; i < charParticles.length; i++) {
    const p = charParticles[i]
    const dispSq = p.dx * p.dx + p.dy * p.dy
    if (dispSq < DISP_THRESHOLD) {
      if (p.char === ' ') continue
      ctx.fillText(p.char, p.restX, p.restY)
    }
  }

  // Pass 2: displaced characters — color shift, no save/restore per char
  // Pre-compute a few color buckets to avoid per-char string creation
  const COLOR_BUCKETS = 5
  const colors = []
  for (let b = 0; b < COLOR_BUCKETS; b++) {
    const t = b / (COLOR_BUCKETS - 1) // 0..1
    const r = Math.round(220 - t * 40)
    const g = Math.round(215 - t * 10)
    const blue = Math.round(205 + t * 50)
    const alpha = (1 - t * 0.5) * 0.95
    colors.push(`rgba(${r},${g},${blue},${alpha.toFixed(2)})`)
  }

  for (let i = 0; i < charParticles.length; i++) {
    const p = charParticles[i]
    const dispSq = p.dx * p.dx + p.dy * p.dy
    if (dispSq < DISP_THRESHOLD) continue
    if (p.char === ' ') continue

    const disp = Math.sqrt(dispSq)
    const x = p.restX + p.dx
    const y = p.restY + p.dy

    // Pick color bucket
    const bucket = Math.min(Math.floor(disp / 20), COLOR_BUCKETS - 1)
    ctx.fillStyle = colors[bucket]

    // Subtle rotation only for fast-moving chars (skip transform for slow ones)
    const rotation = p.vx * 0.001 + wind * TEXT_SKEW_FACTOR * 0.3
    if (Math.abs(rotation) > 0.01) {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rotation)
      ctx.fillText(p.char, 0, 0)
      ctx.restore()
    } else {
      ctx.fillText(p.char, x, y)
    }
  }
}

// ── Rain: single batch stroke, no shadows, no gradients ──────────
function drawRain(ctx, droplets) {
  ctx.lineCap = 'round'
  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'

  // Group droplets by approximate opacity to reduce strokeStyle changes
  // Use 4 opacity bands
  const bands = [[], [], [], []]
  for (const d of droplets) {
    const band = Math.min(Math.floor(d.opacity * 10), 3)
    bands[band].push(d)
  }

  for (let b = 0; b < 4; b++) {
    const list = bands[b]
    if (list.length === 0) continue
    const avgOpacity = (b + 0.5) / 10
    ctx.strokeStyle = `rgba(${RAIN_COLOR_R},${RAIN_COLOR_G},${RAIN_COLOR_B},${avgOpacity.toFixed(2)})`

    for (const d of list) {
      const windAngleX = d.vx * 0.018
      ctx.lineWidth = d.width
      ctx.beginPath()
      ctx.moveTo(d.x, d.y)
      ctx.lineTo(d.x - windAngleX, d.y - d.length)
      ctx.stroke()
    }
  }
}

// ── Splashes: simple dots, no shadows ────────────────────────────
function drawSplashes(ctx, splashes) {
  if (splashes.length === 0) return
  ctx.shadowBlur = 0

  for (const s of splashes) {
    const t = s.life / s.maxLife
    const alpha = t * 0.7
    ctx.globalAlpha = alpha
    ctx.fillStyle = 'rgb(200,225,255)'
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.radius * (0.4 + t * 0.6), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

// ── Water sheen: only for active impacts ─────────────────────────
function drawWaterSheen(ctx, impacts) {
  for (const imp of impacts) {
    if (imp.alpha < 0.15) continue
    const r = imp.radius * 1.1
    const a = imp.alpha * 0.05
    ctx.globalAlpha = a
    ctx.fillStyle = 'rgb(170,205,255)'
    ctx.beginPath()
    ctx.arc(imp.x, imp.y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}
