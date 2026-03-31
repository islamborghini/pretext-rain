import { easeOutCubic } from './utils.js'
import { IMPACT_MAX_ACTIVE, IMPACT_MIN_INTERVAL } from './config.js'

/**
 * Visual impact rings — purely cosmetic expanding circles.
 * The actual force on characters is applied separately via applyImpact().
 */

const impacts = []
let lastSpawnTime = 0

const EXPAND_SPEED = 80
const FADE_DURATION = 1.8
const MAX_RADIUS = 100

export function spawnImpactVisual(x, y, now) {
  if (impacts.length >= IMPACT_MAX_ACTIVE) return false
  if (now - lastSpawnTime < IMPACT_MIN_INTERVAL) return false

  lastSpawnTime = now
  impacts.push({
    x, y,
    radius: 3,
    maxRadius: MAX_RADIUS,
    age: 0,
    alpha: 1,
  })
  return true
}

export function updateImpacts(dt) {
  for (let i = impacts.length - 1; i >= 0; i--) {
    const imp = impacts[i]
    imp.age += dt
    imp.radius = Math.min(imp.radius + EXPAND_SPEED * dt, imp.maxRadius)

    const progress = Math.min(imp.age / FADE_DURATION, 1)
    imp.alpha = 1 - easeOutCubic(progress)

    if (imp.alpha <= 0.01) {
      impacts.splice(i, 1)
    }
  }
}

export function getImpacts() {
  return impacts
}
