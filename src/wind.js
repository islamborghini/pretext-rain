import { lerp, clamp } from './utils.js'
import { WIND_LERP } from './config.js'

let targetWind = 0
let currentWind = 0

export function setWindTarget(mouseX, canvasWidth) {
  targetWind = clamp((mouseX / canvasWidth - 0.5) * 2, -1, 1)
}

export function updateWind() {
  currentWind = lerp(currentWind, targetWind, WIND_LERP)
  return currentWind
}

export function getWind() {
  return currentWind
}
