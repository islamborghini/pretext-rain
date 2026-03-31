# Pretext Rain

An interactive canvas experiment where a paragraph of text behaves like a water surface under rainfall.

The text layout is generated with [`@chenglou/pretext`](https://www.npmjs.com/package/@chenglou/pretext), then each character is simulated as its own particle. Raindrop impacts create dispersive wave fields that push letters around, while the renderer adds fog, splash particles, ripple rings, and a dark atmospheric background.

## What It Does

- Lays out a paragraph into a centered text block using `@chenglou/pretext`
- Simulates raindrops with size-based velocity and momentum
- Spawns crown splashes and visible impact rings on text hits
- Displaces individual letters with analytical capillary-gravity waves
- Lets you switch between `light`, `medium`, `heavy`, and `storm` rain presets
- Adds wind influence based on pointer position

## Project Structure

```text
src/
  main.js         App setup, resize handling, animation loop, UI wiring
  config.js       Typography, colors, physics constants, paragraph text
  text-layout.js  Pretext layout + per-character wave displacement
  rain.js         Droplet spawning, impact detection, splash particles
  impacts.js      Visible ripple ring lifecycle
  renderer.js     Canvas rendering for background, text, rain, fog, splashes
  wind.js         Pointer-driven wind state
  intensity.js    Rain preset state
  utils.js        Small math helpers
```

## Getting Started

Requirements:

- Node.js `20.19+` or `22.12+`

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

## Controls

- Move the mouse horizontally to change wind direction and strength
- Use the bottom-right buttons to switch rain intensity

## Notes

- This branch currently uses `vite@8`, so older Node 20 releases such as `20.10.0` are not enough to build it.
- The canvas is full-screen and the text area is recalculated on resize.
- The paragraph text and most visual/physics tuning values live in [src/config.js](/Users/islam/pretext-weather/src/config.js).
