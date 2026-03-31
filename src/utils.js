export function lerp(a, b, t) {
  return a + (b - a) * t
}

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v
}

export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

export function rand(min, max) {
  return min + Math.random() * (max - min)
}
