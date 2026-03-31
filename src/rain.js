import { rand } from './utils.js'
import {
  RAIN_COUNT, RAIN_MIN_SPEED, RAIN_MAX_SPEED,
  RAIN_MIN_LENGTH, RAIN_MAX_LENGTH, RAIN_BASE_OPACITY,
  WIND_MAX_STRENGTH, SPLASH_COUNT, SPLASH_SPEED, SPLASH_LIFE, SPLASH_RADIUS,
} from './config.js'

const droplets = []
const splashes = []

function createDroplet(canvasW, canvasH, startAtTop) {
  return {
    x: rand(-50, canvasW + 50),
    y: startAtTop ? rand(-canvasH * 0.3, -10) : rand(-canvasH, canvasH),
    vy: rand(RAIN_MIN_SPEED, RAIN_MAX_SPEED),
    vx: 0,
    length: rand(RAIN_MIN_LENGTH, RAIN_MAX_LENGTH),
    opacity: rand(RAIN_BASE_OPACITY * 0.6, RAIN_BASE_OPACITY),
    width: rand(0.8, 1.6),
  }
}

export function initRain(canvasW, canvasH) {
  droplets.length = 0
  splashes.length = 0
  for (let i = 0; i < RAIN_COUNT; i++) {
    droplets.push(createDroplet(canvasW, canvasH, false))
  }
}

function spawnSplash(x, y, wind) {
  for (let i = 0; i < SPLASH_COUNT; i++) {
    const angle = rand(-Math.PI * 0.85, -Math.PI * 0.15)
    const speed = rand(SPLASH_SPEED * 0.4, SPLASH_SPEED)
    splashes.push({
      x, y,
      vx: Math.cos(angle) * speed + wind * WIND_MAX_STRENGTH * 0.25,
      vy: Math.sin(angle) * speed,
      life: rand(SPLASH_LIFE * 0.6, SPLASH_LIFE),
      maxLife: SPLASH_LIFE,
      radius: rand(SPLASH_RADIUS * 0.5, SPLASH_RADIUS),
    })
  }
}

/**
 * Update rain. Returns impact points { x, y } for drops that hit the text area.
 * Only a fraction of hits produce actual character-displacing impacts.
 */
export function updateRain(dt, wind, textArea, canvasW, canvasH) {
  const impacts = []
  const windVx = wind * WIND_MAX_STRENGTH

  for (let i = 0; i < droplets.length; i++) {
    const d = droplets[i]
    d.vx = windVx + rand(-10, 10)
    d.x += d.vx * dt
    d.y += d.vy * dt

    // Impact with text area
    if (textArea && d.y >= textArea.y && d.y <= textArea.y + textArea.height) {
      if (d.x >= textArea.x && d.x <= textArea.x + textArea.width) {
        // ~4% of drops landing in text area create a big impact
        if (Math.random() < 0.04) {
          impacts.push({ x: d.x, y: d.y })
        }
        spawnSplash(d.x, d.y, wind)
        Object.assign(d, createDroplet(canvasW, canvasH, true))
        continue
      }
    }

    // Off screen → reset
    if (d.y > canvasH + 30 || d.x < -100 || d.x > canvasW + 100) {
      Object.assign(d, createDroplet(canvasW, canvasH, true))
    }
  }

  // Update splashes
  for (let i = splashes.length - 1; i >= 0; i--) {
    const s = splashes[i]
    s.x += s.vx * dt
    s.y += s.vy * dt
    s.vy += 400 * dt
    s.life -= dt
    if (s.life <= 0) splashes.splice(i, 1)
  }

  return impacts
}

export function getDroplets() { return droplets }
export function getSplashes() { return splashes }
