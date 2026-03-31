import { RAIN_PRESETS, RAIN_DEFAULT_INTENSITY } from './config.js'

let current = RAIN_DEFAULT_INTENSITY
const keys = Object.keys(RAIN_PRESETS)

export function getIntensity() {
  return RAIN_PRESETS[current]
}

export function getIntensityName() {
  return current
}

export function setIntensity(name) {
  if (RAIN_PRESETS[name]) current = name
}

export function cycleIntensity() {
  const idx = keys.indexOf(current)
  current = keys[(idx + 1) % keys.length]
  return current
}

export function getIntensityKeys() {
  return keys
}

export function getIntensityIndex() {
  return Math.max(keys.indexOf(current), 0)
}

export function setIntensityByIndex(index) {
  const next = keys[index]
  if (next) current = next
  return current
}
