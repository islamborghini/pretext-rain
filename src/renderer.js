import { rand } from './utils.js'
import {
  FONT, LINE_HEIGHT, TEXT_COLOR, TEXT_SKEW_FACTOR,
  BG_TOP, BG_MID, BG_BOT,
  RAIN_COLOR_R, RAIN_COLOR_G, RAIN_COLOR_B,
  FOG_COUNT, FONT_SIZE, IMPACT_RADIUS,
} from './config.js'

// Fog particles
let fogParticles = []

export function initFog(canvasW, canvasH) {
  fogParticles = []
  for (let i = 0; i < FOG_COUNT; i++) {
    fogParticles.push({
      x: rand(0, canvasW),
      y: rand(0, canvasH),
      radius: rand(80, 220),
      opacity: rand(0.008, 0.022),
      vx: rand(-8, 8),
      vy: rand(-3, 3),
    })
  }
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

export function render(ctx, canvasW, canvasH, dpr, charParticles, droplets, splashes, impacts, wind, dt) {
  ctx.save()
  ctx.scale(dpr, dpr)

  // 1. Background
  drawBackground(ctx, canvasW, canvasH)

  // 2. Fog
  updateFog(dt, canvasW, canvasH, wind)
  drawFog(ctx)

  // 3. Impact ripple visuals (under text)
  drawImpactRings(ctx, impacts)

  // 4. Characters (each at displaced position)
  drawCharacters(ctx, charParticles, wind)

  // 5. Rain
  drawRain(ctx, droplets, wind)

  // 6. Splashes
  drawSplashes(ctx, splashes)

  ctx.restore()
}

function drawBackground(ctx, w, h) {
  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, BG_TOP)
  grad.addColorStop(0.45, BG_MID)
  grad.addColorStop(1, BG_BOT)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
}

function drawFog(ctx) {
  for (const f of fogParticles) {
    const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius)
    grad.addColorStop(0, `rgba(150, 170, 200, ${f.opacity})`)
    grad.addColorStop(1, 'rgba(150, 170, 200, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(f.x - f.radius, f.y - f.radius, f.radius * 2, f.radius * 2)
  }
}

function drawImpactRings(ctx, impacts) {
  for (const imp of impacts) {
    const a = imp.alpha

    // Outer expanding ring
    ctx.save()
    ctx.shadowBlur = 15
    ctx.shadowColor = `rgba(100, 160, 255, ${a * 0.3})`
    ctx.beginPath()
    ctx.arc(imp.x, imp.y, imp.radius, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(140, 190, 255, ${a * 0.45})`
    ctx.lineWidth = 1.8
    ctx.stroke()
    ctx.restore()

    // Second ring
    if (imp.radius > 10) {
      ctx.beginPath()
      ctx.arc(imp.x, imp.y, imp.radius * 0.6, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(160, 200, 255, ${a * 0.25})`
      ctx.lineWidth = 1.2
      ctx.stroke()
    }

    // Third ring
    if (imp.radius > 20) {
      ctx.beginPath()
      ctx.arc(imp.x, imp.y, imp.radius * 0.3, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(180, 215, 255, ${a * 0.15})`
      ctx.lineWidth = 0.8
      ctx.stroke()
    }

    // Center glow
    if (a > 0.2) {
      const ga = (a - 0.2) / 0.8
      const grad = ctx.createRadialGradient(imp.x, imp.y, 0, imp.x, imp.y, 8)
      grad.addColorStop(0, `rgba(200, 225, 255, ${ga * 0.4})`)
      grad.addColorStop(1, 'rgba(200, 225, 255, 0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(imp.x, imp.y, 8, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function drawCharacters(ctx, charParticles, wind) {
  ctx.font = FONT
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'

  for (let i = 0; i < charParticles.length; i++) {
    const p = charParticles[i]
    if (p.char === ' ' && Math.abs(p.dx) < 1 && Math.abs(p.dy) < 1) continue // skip undisplaced spaces

    const x = p.restX + p.dx
    const y = p.restY + p.dy

    // Displacement magnitude for visual effects
    const disp = Math.sqrt(p.dx * p.dx + p.dy * p.dy)

    // Opacity: slightly fade characters that are heavily displaced
    const dispFade = Math.max(0.3, 1 - disp / 120)

    // Color shift: displaced chars get a subtle blue tint (water feel)
    const blueShift = Math.min(disp / 60, 1)
    const r = Math.round(220 - blueShift * 40)
    const g = Math.round(215 - blueShift * 10)
    const b = Math.round(205 + blueShift * 50)

    ctx.save()

    // Subtle rotation from displacement velocity
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
    const rotation = (p.vx * 0.001) + (wind * TEXT_SKEW_FACTOR * 0.3)

    if (Math.abs(rotation) > 0.001) {
      ctx.translate(x, y)
      ctx.rotate(rotation)
      ctx.translate(-x, -y)
    }

    // Glow for displaced characters
    if (disp > 5) {
      ctx.shadowBlur = Math.min(disp * 0.15, 6)
      ctx.shadowColor = `rgba(150, 190, 255, ${Math.min(disp / 80, 0.3)})`
    }

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${dispFade * 0.95})`
    ctx.fillText(p.char, x, y)

    ctx.restore()
  }
}

function drawRain(ctx, droplets, wind) {
  ctx.lineCap = 'round'
  const c = `${RAIN_COLOR_R}, ${RAIN_COLOR_G}, ${RAIN_COLOR_B}`

  for (const d of droplets) {
    const windAngleX = d.vx * 0.018
    const x1 = d.x
    const y1 = d.y
    const x2 = d.x - windAngleX
    const y2 = d.y - d.length

    const grad = ctx.createLinearGradient(x1, y1, x2, y2)
    grad.addColorStop(0, `rgba(${c}, ${d.opacity})`)
    grad.addColorStop(0.4, `rgba(${c}, ${d.opacity * 1.4})`)
    grad.addColorStop(1, `rgba(${c}, 0)`)

    ctx.save()
    ctx.shadowBlur = 2
    ctx.shadowColor = `rgba(${c}, ${d.opacity * 0.4})`
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = grad
    ctx.lineWidth = d.width
    ctx.stroke()
    ctx.restore()
  }
}

function drawSplashes(ctx, splashes) {
  for (const s of splashes) {
    const t = s.life / s.maxLife
    const alpha = t * 0.8

    ctx.save()
    ctx.shadowBlur = 4
    ctx.shadowColor = `rgba(170, 200, 255, ${alpha * 0.4})`
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.radius * (0.4 + t * 0.6), 0, Math.PI * 2)
    ctx.fillStyle = `rgba(200, 225, 255, ${alpha})`
    ctx.fill()
    ctx.restore()
  }
}
