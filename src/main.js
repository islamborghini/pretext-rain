import { FONT } from './config.js'
import { buildCharParticles, addWave, evaluateWaves, getCharParticles } from './text-layout.js'
import { initRain, syncRainCount, updateRain, getDroplets, getSplashes } from './rain.js'
import { spawnWaveVisual, updateWaveVisuals, getWaveVisuals } from './impacts.js'
import { setWindTarget, updateWind } from './wind.js'
import { render, initFog } from './renderer.js'
import { getIntensityName, setIntensity, getIntensityKeys } from './intensity.js'

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

// ── Intensity toggle UI ──────────────────────────────────────────
function buildToggle() {
  const container = document.getElementById('intensity-toggle')
  const keys = getIntensityKeys()

  function updateButtons() {
    const active = getIntensityName()
    for (const btn of container.children) {
      btn.classList.toggle('active', btn.dataset.key === active)
    }
  }

  for (const key of keys) {
    const btn = document.createElement('button')
    btn.textContent = key
    btn.dataset.key = key
    btn.addEventListener('click', () => {
      setIntensity(key)
      updateButtons()
    })
    container.appendChild(btn)
  }

  updateButtons()
}

// ── Main loop ────────────────────────────────────────────────────
function loop(now) {
  requestAnimationFrame(loop)

  const dt = lastTime === 0 ? 0.016 : Math.min((now - lastTime) / 1000, 0.033)
  lastTime = now

  const wind = updateWind()

  syncRainCount(canvasW, canvasH)

  const rainImpacts = updateRain(dt, wind, textArea, canvasW, canvasH)

  // Register new wave sources from raindrop impacts
  for (const imp of rainImpacts) {
    if (spawnWaveVisual(imp.x, imp.y, now, imp.momentum)) {
      addWave(imp.x, imp.y, imp.momentum)
    }
  }

  // Update visual ring tracking
  updateWaveVisuals(dt)

  // Evaluate analytical wave displacement for all characters
  evaluateWaves(dt, wind)

  render(
    ctx, canvasW, canvasH, dpr,
    getCharParticles(), getDroplets(), getSplashes(), getWaveVisuals(),
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
  buildToggle()

  window.addEventListener('resize', resize)
  window.addEventListener('mousemove', (e) => setWindTarget(e.clientX, canvasW))
  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) setWindTarget(e.touches[0].clientX, canvasW)
  }, { passive: true })

  requestAnimationFrame(loop)
}

init()
