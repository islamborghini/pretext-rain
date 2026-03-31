import { prepareWithSegments, layoutNextLine } from "https://esm.sh/@chenglou/pretext"
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
 *   lineIndex     — which line this char belongs to (for neighbor forces)
 *   indexInLine   — position within line
 */

let charParticles = []
let lineRanges = [] // { start, end } indices into charParticles per line
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
 */
export function buildCharParticles(textArea) {
  prepared = prepareWithSegments(PARAGRAPH_TEXT, FONT)
  const ctx = getMeasureCtx()

  const newParticles = []
  const newLineRanges = []
  let cursor = { segmentIndex: 0, graphemeIndex: 0 }
  let lineTop = textArea.y
  let lineIdx = 0

  while (lineTop + LINE_HEIGHT <= textArea.y + textArea.height) {
    const line = layoutNextLine(prepared, cursor, textArea.width)
    if (line === null) break

    const lineStart = newParticles.length
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
        lineIndex: lineIdx,
        indexInLine: i,
      })

      xPos += charW
    }

    newLineRanges.push({ start: lineStart, end: newParticles.length })
    cursor = line.end
    lineTop += LINE_HEIGHT
    lineIdx++
  }

  // Preserve displacement state on resize if particle count matches
  if (charParticles.length === newParticles.length) {
    for (let i = 0; i < newParticles.length; i++) {
      newParticles[i].dx = charParticles[i].dx
      newParticles[i].dy = charParticles[i].dy
      newParticles[i].vx = charParticles[i].vx
      newParticles[i].vy = charParticles[i].vy
    }
  }

  charParticles = newParticles
  lineRanges = newLineRanges
}

/**
 * Apply a radial impulse from an impact point.
 * Smooth falloff creates a water-splash pattern.
 */
export function applyImpact(ix, iy) {
  for (let i = 0; i < charParticles.length; i++) {
    const p = charParticles[i]
    const px = p.restX + p.dx
    const py = p.restY + p.dy
    const ex = px - ix
    const ey = py - iy
    const distSq = ex * ex + ey * ey
    const radiusSq = IMPACT_RADIUS * IMPACT_RADIUS

    if (distSq < radiusSq && distSq > 1) {
      const dist = Math.sqrt(distSq)
      // Smooth bell-curve falloff for fluid feel
      const t = dist / IMPACT_RADIUS
      const falloff = Math.exp(-t * t * 3) // gaussian-ish
      const strength = IMPACT_FORCE * falloff
      const nx = ex / dist
      const ny = ey / dist
      p.vx += nx * strength * 0.016
      p.vy += ny * strength * 0.016
    }
  }
}

/**
 * Step physics: spring + damping + neighbor coupling.
 * The neighbor coupling propagates displacement like a wave through the text.
 */
export function updateCharPhysics(dt, wind) {
  const particles = charParticles
  const len = particles.length
  if (len === 0) return false

  // Neighbor coupling: displaced characters nudge their neighbors
  // This creates a wave-propagation effect through the text
  const NEIGHBOR_COUPLING = 12
  for (let li = 0; li < lineRanges.length; li++) {
    const { start, end } = lineRanges[li]
    for (let i = start; i < end; i++) {
      const p = particles[i]
      // Left neighbor
      if (i > start) {
        const left = particles[i - 1]
        const ddx = p.dx - left.dx
        const ddy = p.dy - left.dy
        p.vx -= ddx * NEIGHBOR_COUPLING * dt
        p.vy -= ddy * NEIGHBOR_COUPLING * dt
        left.vx += ddx * NEIGHBOR_COUPLING * dt
        left.vy += ddy * NEIGHBOR_COUPLING * dt
      }
    }
  }

  // Also couple vertically between lines (characters at similar X)
  // Simplified: just couple with the particle directly above/below by index ratio
  for (let li = 1; li < lineRanges.length; li++) {
    const above = lineRanges[li - 1]
    const current = lineRanges[li]
    const aboveLen = above.end - above.start
    const currLen = current.end - current.start
    if (aboveLen === 0 || currLen === 0) continue

    const VERTICAL_COUPLING = 6
    for (let ci = current.start; ci < current.end; ci++) {
      const p = particles[ci]
      // Map to corresponding index in line above
      const ratio = (ci - current.start) / currLen
      const ai = above.start + Math.floor(ratio * aboveLen)
      const a = particles[ai]
      if (!a) continue

      const ddx = p.dx - a.dx
      const ddy = p.dy - a.dy
      p.vx -= ddx * VERTICAL_COUPLING * dt
      p.vy -= ddy * VERTICAL_COUPLING * dt
      a.vx += ddx * VERTICAL_COUPLING * dt
      a.vy += ddy * VERTICAL_COUPLING * dt
    }
  }

  let anyMoving = false

  for (let i = 0; i < len; i++) {
    const p = particles[i]

    // Spring force toward rest position
    const fx = -CHAR_SPRING * p.dx
    const fy = -CHAR_SPRING * p.dy

    // Wind: gentle continuous lateral push
    const windForce = wind * 25

    // Integrate velocity
    p.vx += (fx + windForce) * dt
    p.vy += fy * dt

    // Damping (underdamped for oscillation / fluid feel)
    const damp = 1 - CHAR_DAMPING * dt
    p.vx *= damp > 0 ? damp : 0
    p.vy *= damp > 0 ? damp : 0

    // Integrate position
    p.dx += p.vx * dt
    p.dy += p.vy * dt

    // Soft clamp displacement
    const dist = Math.sqrt(p.dx * p.dx + p.dy * p.dy)
    if (dist > CHAR_MAX_DISP) {
      const scale = CHAR_MAX_DISP / dist
      p.dx *= scale
      p.dy *= scale
      p.vx *= 0.6
      p.vy *= 0.6
    }

    if (Math.abs(p.vx) > 0.05 || Math.abs(p.vy) > 0.05 ||
        Math.abs(p.dx) > 0.05 || Math.abs(p.dy) > 0.05) {
      anyMoving = true
    }
  }

  return anyMoving
}

export function getCharParticles() {
  return charParticles
}
