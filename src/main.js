import { FONT } from './config.js'
import { buildCharParticles, addWave, evaluateWaves, getCharParticles } from './text-layout.js'
import {
  initRain, syncRainCount, updateRain, getDroplets, getSplashes,
  getMaxDropletSizeKeys, getMaxDropletSizeIndex, getMaxDropletSizeName, setMaxDropletSizeByIndex,
} from './rain.js'
import { spawnWaveVisual, updateWaveVisuals, getWaveVisuals } from './impacts.js'
import { setWindTarget, updateWind } from './wind.js'
import { render, initFog } from './renderer.js'
import { getIntensityIndex, getIntensityKeys, getIntensityName, setIntensityByIndex } from './intensity.js'

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

// ── Controls UI ──────────────────────────────────────────────────
function buildToggle() {
  const container = document.getElementById('intensity-toggle')
  const rainKeys = getIntensityKeys()
  const sizeKeys = getMaxDropletSizeKeys()

  const rainLabel = document.createElement('label')
  rainLabel.className = 'control'
  const rainTitle = document.createElement('span')
  rainTitle.className = 'control-title'
  const rainValue = document.createElement('span')
  rainValue.className = 'control-value'
  const rainSlider = document.createElement('input')
  rainSlider.type = 'range'
  rainSlider.min = '0'
  rainSlider.max = String(rainKeys.length - 1)
  rainSlider.step = '1'

  const sizeLabel = document.createElement('label')
  sizeLabel.className = 'control'
  const sizeTitle = document.createElement('span')
  sizeTitle.className = 'control-title'
  const sizeValue = document.createElement('span')
  sizeValue.className = 'control-value'
  const sizeSlider = document.createElement('input')
  sizeSlider.type = 'range'
  sizeSlider.min = '0'
  sizeSlider.max = String(sizeKeys.length - 1)
  sizeSlider.step = '1'

  function updateButtons() {
    rainTitle.textContent = 'Rain intensity'
    rainValue.textContent = getIntensityName()
    rainSlider.value = String(getIntensityIndex())

    sizeTitle.textContent = 'Max droplet size'
    sizeValue.textContent = getMaxDropletSizeName()
    sizeSlider.value = String(getMaxDropletSizeIndex())
  }

  rainSlider.addEventListener('input', () => {
    setIntensityByIndex(Number(rainSlider.value))
    updateButtons()
  })

  sizeSlider.addEventListener('input', () => {
    setMaxDropletSizeByIndex(Number(sizeSlider.value))
    updateButtons()
  })

  rainLabel.appendChild(rainTitle)
  rainLabel.appendChild(rainValue)
  rainLabel.appendChild(rainSlider)

  sizeLabel.appendChild(sizeTitle)
  sizeLabel.appendChild(sizeValue)
  sizeLabel.appendChild(sizeSlider)

  container.appendChild(rainLabel)
  container.appendChild(sizeLabel)

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
