export function lerp(a, b, t) {
  return a + (b - a) * t
}

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v
}

export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

export function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t)
}

export function rand(min, max) {
  return min + Math.random() * (max - min)
}

export function randInt(min, max) {
  return Math.floor(rand(min, max + 1))
}

/**
 * Compute the X interval blocked by a circle at a given Y band.
 * Returns null if the circle doesn't intersect the band.
 */
export function circleBlockedInterval(cx, cy, r, bandTop, bandBottom, padding) {
  const effectiveR = r + padding
  // Find the closest Y point in the band to the circle center
  const closestY = clamp(cy, bandTop, bandBottom)
  const dy = Math.abs(cy - closestY)
  if (dy >= effectiveR) return null
  const dx = Math.sqrt(effectiveR * effectiveR - dy * dy)
  return { left: cx - dx, right: cx + dx }
}

/**
 * Given a full interval [fullLeft, fullRight] and a list of blocked intervals,
 * return the available (unblocked) slots.
 */
export function carveSlots(fullLeft, fullRight, blocked) {
  if (blocked.length === 0) {
    return [{ left: fullLeft, right: fullRight }]
  }

  // Sort by left edge
  const sorted = blocked.slice().sort((a, b) => a.left - b.left)

  // Merge overlapping
  const merged = [sorted[0]]
  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1]
    const curr = sorted[i]
    if (curr.left <= prev.right) {
      prev.right = Math.max(prev.right, curr.right)
    } else {
      merged.push(curr)
    }
  }

  // Carve gaps
  const slots = []
  let cursor = fullLeft

  for (const block of merged) {
    const blockLeft = Math.max(block.left, fullLeft)
    const blockRight = Math.min(block.right, fullRight)

    if (cursor < blockLeft) {
      slots.push({ left: cursor, right: blockLeft })
    }
    cursor = Math.max(cursor, blockRight)
  }

  if (cursor < fullRight) {
    slots.push({ left: cursor, right: fullRight })
  }

  return slots
}
