import { rand } from './utils.js'
import {
  RAIN_DROP_SIZES,
  WIND_MAX_STRENGTH,
  SPLASH_EJECT_ANGLE_MIN, SPLASH_EJECT_ANGLE_MAX,
  SPLASH_SPEED_BASE, SPLASH_LIFE, SPLASH_RADIUS,
} from './config.js'
import { getIntensity } from './intensity.js'

const droplets = []
const splashes = []

/**
 * Pick a raindrop size class using the weighted distribution.
 * Smaller drops are more common (Marshall-Palmer distribution approximation).
 */
function pickDropSize() {
  let r = Math.random()
  for (const size of RAIN_DROP_SIZES) {
    r -= size.weight
    if (r <= 0) return size
  }
  return RAIN_DROP_SIZES[0]
}

function createDroplet(canvasW, canvasH, startAtTop) {
  const size = pickDropSize()
  return {
    x: rand(-50, canvasW + 50),
    y: startAtTop ? rand(-canvasH * 0.3, -10) : rand(-canvasH, canvasH),
    vy: size.velocity * rand(0.9, 1.1),
    vx: 0,
    length: size.length * rand(0.85, 1.15),
    opacity: size.opacity * rand(0.8, 1.2),
    width: size.width,
    diameter: size.diameter,
    // Momentum: small ~0.3, medium ~1.0, large ~1.8, huge ~2.8
    momentum: Math.min(Math.pow(size.diameter / 2.5, 2) * (size.velocity / 600), 3.0),
  }
}

export function initRain(canvasW, canvasH) {
  droplets.length = 0
  splashes.length = 0
  const { count } = getIntensity()
  for (let i = 0; i < count; i++) {
    droplets.push(createDroplet(canvasW, canvasH, false))
  }
}

export function syncRainCount(canvasW, canvasH) {
  const { count } = getIntensity()
  while (droplets.length < count) {
    droplets.push(createDroplet(canvasW, canvasH, true))
    if (droplets.length % 5 === 0) break
  }
  while (droplets.length > count) {
    droplets.pop()
  }
}

/**
 * Crown splash: secondary droplets eject at 40-70° from horizontal
 * (Rayleigh-Taylor instability at the crown rim).
 * Larger impacting drops produce more and faster secondary droplets.
 */
function spawnCrownSplash(x, y, wind, splashCount, dropMomentum) {
  const speedScale = 1 + dropMomentum * 2 // larger drops → faster splashes
  for (let i = 0; i < splashCount; i++) {
    // Ejection angle from horizontal (upward) — 40° to 70° range
    const angle = -(SPLASH_EJECT_ANGLE_MIN + Math.random() * (SPLASH_EJECT_ANGLE_MAX - SPLASH_EJECT_ANGLE_MIN))
    // Random azimuth (left or right bias from wind)
    const azimuth = Math.random() < 0.5 ? -1 : 1
    const speed = rand(SPLASH_SPEED_BASE * 0.5, SPLASH_SPEED_BASE) * speedScale

    splashes.push({
      x, y,
      vx: Math.cos(angle) * speed * azimuth + wind * WIND_MAX_STRENGTH * 0.2,
      vy: Math.sin(angle) * speed,
      life: rand(SPLASH_LIFE * 0.6, SPLASH_LIFE),
      maxLife: SPLASH_LIFE,
      radius: rand(SPLASH_RADIUS * 0.4, SPLASH_RADIUS) * (1 + dropMomentum),
    })
  }
}

export function updateRain(dt, wind, textArea, canvasW, canvasH) {
  const impacts = []
  const windVx = wind * WIND_MAX_STRENGTH
  const { splash } = getIntensity()

  for (let i = 0; i < droplets.length; i++) {
    const d = droplets[i]
    d.vx = windVx + rand(-10, 10)
    d.x += d.vx * dt
    d.y += d.vy * dt

    if (textArea && d.y >= textArea.y && d.y <= textArea.y + textArea.height) {
      if (d.x >= textArea.x && d.x <= textArea.x + textArea.width) {
        // Every drop creates a wave — amplitude scales with momentum
        impacts.push({ x: d.x, y: d.y, momentum: d.momentum })
        spawnCrownSplash(d.x, d.y, wind, splash, d.momentum)
        Object.assign(d, createDroplet(canvasW, canvasH, true))
        continue
      }
    }

    if (d.y > canvasH + 30 || d.x < -100 || d.x > canvasW + 100) {
      Object.assign(d, createDroplet(canvasW, canvasH, true))
    }
  }

  for (let i = splashes.length - 1; i >= 0; i--) {
    const s = splashes[i]
    s.x += s.vx * dt
    s.y += s.vy * dt
    s.vy += 500 * dt // gravity on secondary droplets
    s.life -= dt
    if (s.life <= 0) splashes.splice(i, 1)
  }

  return impacts
}

export function getDroplets() { return droplets }
export function getSplashes() { return splashes }
