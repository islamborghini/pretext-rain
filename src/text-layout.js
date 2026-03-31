import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext'
import {
  FONT, LINE_HEIGHT, PARAGRAPH_TEXT,
  CHAR_SPRING, CHAR_DAMPING, CHAR_MAX_DISP,
  IMPACT_FORCE, IMPACT_RADIUS,
} from './config.js'

/**
 * Each character is a physics particle:
 *   restX, restY  — where it belongs in the laid-out paragraph
 *   dx, dy        — displacement from rest
 *   vx, vy        — velocity of displacement
 *   char          — the character string
 *   charWidth     — measured width for rendering
 */

let charParticles = []
let prepared = null
let measureCtx = null

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
 * Called once on init and on resize.
 */
export function buildCharParticles(textArea) {
  prepared = prepareWithSegments(PARAGRAPH_TEXT, FONT)
  const ctx = getMeasureCtx()

  const newParticles = []
  let cursor = { segmentIndex: 0, graphemeIndex: 0 }
  let lineTop = textArea.y

  while (lineTop + LINE_HEIGHT <= textArea.y + textArea.height) {
    const line = layoutNextLine(prepared, cursor, textArea.width)
    if (line === null) break

    // Measure each character in this line to get precise X positions
    let xPos = textArea.x
    const text = line.text

    for (let i = 0; i < text.length; i++) {
      const ch = text[i]
      const charW = ctx.measureText(ch).width

      newParticles.push({
        restX: xPos + charW / 2,  // center of character
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

  // If we had old particles, try to preserve their displacement state
  // (for smooth resize transitions)
  if (charParticles.length === newParticles.length) {
    for (let i = 0; i < newParticles.length; i++) {
      newParticles[i].dx = charParticles[i].dx
      newParticles[i].dy = charParticles[i].dy
      newParticles[i].vx = charParticles[i].vx
      newParticles[i].vy = charParticles[i].vy
    }
  }

  charParticles = newParticles
}

/**
 * Apply a radial impulse from an impact point.
 * Characters near the impact get pushed outward like fluid.
 */
export function applyImpact(ix, iy) {
  for (let i = 0; i < charParticles.length; i++) {
    const p = charParticles[i]
    const px = p.restX + p.dx
    const py = p.restY + p.dy
    const ex = px - ix
    const ey = py - iy
    const dist = Math.sqrt(ex * ex + ey * ey)

    if (dist < IMPACT_RADIUS && dist > 0.1) {
      // Force falls off with distance squared (inverse square, capped)
      const falloff = 1 - dist / IMPACT_RADIUS
      const strength = IMPACT_FORCE * falloff * falloff
      const nx = ex / dist
      const ny = ey / dist
      p.vx += nx * strength * 0.016 // impulse (assuming ~60fps frame)
      p.vy += ny * strength * 0.016
    }
  }
}

/**
 * Step physics: spring back to rest + damping.
 */
export function updateCharPhysics(dt, wind) {
  let anyMoving = false

  for (let i = 0; i < charParticles.length; i++) {
    const p = charParticles[i]

    // Spring force toward rest position
    const fx = -CHAR_SPRING * p.dx
    const fy = -CHAR_SPRING * p.dy

    // Wind push — subtle continuous force
    const windForce = wind * 30

    // Integrate
    p.vx += (fx + windForce) * dt
    p.vy += fy * dt

    // Damping
    p.vx *= Math.max(0, 1 - CHAR_DAMPING * dt)
    p.vy *= Math.max(0, 1 - CHAR_DAMPING * dt)

    // Update displacement
    p.dx += p.vx * dt
    p.dy += p.vy * dt

    // Clamp max displacement
    const dist = Math.sqrt(p.dx * p.dx + p.dy * p.dy)
    if (dist > CHAR_MAX_DISP) {
      const scale = CHAR_MAX_DISP / dist
      p.dx *= scale
      p.dy *= scale
      // Also reduce velocity in that direction
      p.vx *= 0.5
      p.vy *= 0.5
    }

    if (Math.abs(p.vx) > 0.1 || Math.abs(p.vy) > 0.1 ||
        Math.abs(p.dx) > 0.1 || Math.abs(p.dy) > 0.1) {
      anyMoving = true
    }
  }

  return anyMoving
}

export function getCharParticles() {
  return charParticles
}
