import { FONT, LINE_HEIGHT } from './config.js'
import { buildCharParticles, applyImpact, updateCharPhysics, getCharParticles } from './text-layout.js'
import { initRain, updateRain, getDroplets, getSplashes } from './rain.js'
import { spawnImpactVisual, updateImpacts, getImpacts } from './impacts.js'
import { setWindTarget, updateWind } from './wind.js'
import { render, initFog } from './renderer.js'

const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')

let canvasW = 0
let canvasH = 0
let dpr = 1
let textArea = null
let lastTime = 0

function resize() {
  dpr = window.devicePixelRatio || 1
  canvasW = window.innerWidth
  canvasH = window.innerHeight
  canvas.width = canvasW * dpr
  canvas.height = canvasH * dpr
  canvas.style.width = canvasW + 'px'
  canvas.style.height = canvasH + 'px'

  // Text area: centered, ~55% width, ~65% height
  const areaW = Math.min(canvasW * 0.55, 680)
  const areaH = canvasH * 0.65
  textArea = {
    x: (canvasW - areaW) / 2,
    y: (canvasH - areaH) / 2,
    width: areaW,
    height: areaH,
  }

  initRain(canvasW, canvasH)
  initFog(canvasW, canvasH)
  buildCharParticles(textArea)
}

function loop(now) {
  requestAnimationFrame(loop)

  const dt = lastTime === 0 ? 0.016 : Math.min((now - lastTime) / 1000, 0.033)
  lastTime = now

  // Wind
  const wind = updateWind()

  // Rain → impacts
  const rainImpacts = updateRain(dt, wind, textArea, canvasW, canvasH)

  // Apply impacts to character physics + spawn visuals
  for (const imp of rainImpacts) {
    if (spawnImpactVisual(imp.x, imp.y, now)) {
      applyImpact(imp.x, imp.y)
    }
  }

  // Update visual impact rings
  updateImpacts(dt)

  // Step character physics
  updateCharPhysics(dt, wind)

  // Render
  render(
    ctx, canvasW, canvasH, dpr,
    getCharParticles(), getDroplets(), getSplashes(), getImpacts(),
    wind, dt
  )
}

async function init() {
  try {
    await document.fonts.load(FONT)
  } catch (e) {
    await new Promise(r => setTimeout(r, 100))
  }

  resize()

  window.addEventListener('resize', resize)

  window.addEventListener('mousemove', (e) => {
    setWindTarget(e.clientX, canvasW)
  })

  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      setWindTarget(e.touches[0].clientX, canvasW)
    }
  }, { passive: true })

  requestAnimationFrame(loop)
}

init()
