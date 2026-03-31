// Typography
export const FONT_FAMILY = 'Georgia, "Times New Roman", serif'
export const FONT_SIZE = 21
export const FONT = `${FONT_SIZE}px ${FONT_FAMILY}`
export const LINE_HEIGHT = 32
export const TEXT_COLOR = 'rgba(220, 215, 205, 0.95)'

// Background
export const BG_TOP = '#0a0e1a'
export const BG_MID = '#1a1a2e'
export const BG_BOT = '#0d0d1a'

// Rain intensity presets: { droplets, splashCount }
// Every drop that hits the text area creates a wave — amplitude scales with momentum.
export const RAIN_PRESETS = {
  light:  { count: 40,  splash: 1 },
  medium: { count: 100, splash: 2 },
  heavy:  { count: 200, splash: 3 },
  storm:  { count: 350, splash: 4 },
}
export const RAIN_DEFAULT_INTENSITY = 'medium'

// ── Real raindrop physics ────────────────────────────────────────
// Raindrop diameter → terminal velocity (from empirical data):
//   0.5mm → 2.0 m/s,  1mm → 4.0 m/s,  2mm → 6.5 m/s,
//   3mm → 8.0 m/s,     4mm → 8.8 m/s
// Screen scale: 1px ≈ 0.3mm. Velocities scaled for visual appeal.
export const RAIN_DROP_SIZES = [
  { diameter: 1.5, velocity: 450, length: 10, width: 0.7, opacity: 0.20, weight: 0.35 },
  { diameter: 2.5, velocity: 600, length: 18, width: 1.0, opacity: 0.30, weight: 0.35 },
  { diameter: 3.5, velocity: 750, length: 24, width: 1.3, opacity: 0.35, weight: 0.20 },
  { diameter: 5.0, velocity: 880, length: 30, width: 1.6, opacity: 0.40, weight: 0.10 },
]
export const RAIN_DROP_SIZE_CAPS = [
  { key: '1.5mm', maxDiameter: 1.5 },
  { key: '2.5mm', maxDiameter: 2.5 },
  { key: '3.5mm', maxDiameter: 3.5 },
  { key: '5.0mm', maxDiameter: 5.0 },
]
export const RAIN_DEFAULT_DROP_SIZE_CAP = '5.0mm'
export const RAIN_COLOR_R = 170
export const RAIN_COLOR_G = 200
export const RAIN_COLOR_B = 255

// ── Crown splash physics ─────────────────────────────────────────
// Secondary droplets eject at 40-70° from horizontal (Rayleigh-Taylor instability)
// Crown radius ∝ √(We) × √(t), We = ρ v² d / σ
export const SPLASH_EJECT_ANGLE_MIN = Math.PI * 0.22  // ~40° from horiz
export const SPLASH_EJECT_ANGLE_MAX = Math.PI * 0.39  // ~70° from horiz
export const SPLASH_SPEED_BASE = 100
export const SPLASH_LIFE = 0.5
export const SPLASH_RADIUS = 1.5

// ── Capillary-gravity wave physics ───────────────────────────────
// Dispersion relation: ω² = g·k + (σ/ρ)·k³
// For water: σ = 0.0728 N/m, ρ = 1000 kg/m³, g = 9.81 m/s²
// Minimum phase velocity: 23.2 cm/s at λ = 1.73 cm
// Viscous damping: amplitude ∝ exp(-2·ν·k²·t), ν = 1.0×10⁻⁶ m²/s
//
// Screen-space wave components (tuned for visual fidelity):
// Each: { k: wavenumber, amp: relative amplitude, decay: temporal decay rate }
// Short waves travel faster (capillary regime) and decay faster — this creates
// the realistic look where fine ripples arrive first, then broader waves follow.
export const WAVE_COMPONENTS = [
  { k: 0.045, amp: 1.0,  decay: 0.6  },  // long gravity wave — slow, persistent
  { k: 0.09,  amp: 0.7,  decay: 1.2  },  // medium gravity-capillary transition
  { k: 0.18,  amp: 0.4,  decay: 2.5  },  // short capillary wave — fast, fades quick
  { k: 0.35,  amp: 0.15, decay: 5.0  },  // very short capillary — arrives first, gone fast
]
// Phase velocity per component: v_p = ω/k, computed from dispersion relation
// Geometric spreading: amplitude ∝ 1/√r (2D cylindrical wave)
// Combined: A(r,t) = A₀ / √(r) × Σ aᵢ × sin(kᵢ·r - ωᵢ·t) × exp(-decayᵢ·t)

export const WAVE_LIFETIME = 3.5        // seconds before wave is removed
export const WAVE_MAX_ACTIVE = 25
export const WAVE_MIN_INTERVAL = 30     // ms between new waves
export const WAVE_AMPLITUDE_BASE = 18   // ← TUNE THIS: base displacement in px per impact
export const WAVE_MAX_DISP = 80         // ← TUNE THIS: hard clamp on total displacement
export const WAVE_INFLUENCE_RADIUS = 250 // px — chars beyond this skip the wave (perf)
export const CLICK_DROP_FORCE = 28
export const CLICK_DROP_RADIUS = 140
export const CLICK_DROP_SPEED = 180
export const CLICK_DROP_BAND = 24
export const CLICK_DROP_LIFE = 0.95

// Wind
export const WIND_MAX_STRENGTH = 220
export const WIND_LERP = 0.025
export const TEXT_LEAN_FACTOR = 0.10
export const TEXT_SKEW_FACTOR = 0.03

// Fog
export const FOG_COUNT = 12

// The paragraph text
export const PARAGRAPH_TEXT = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer in mauris eu nibh euismod gravida. Duis ac tellus et risus vulputate vehicula. Donec lobortis risus a elit. Etiam tempor. Ut ullamcorper, ligula ut dictum pharetra, nisi nunc fringilla magna, in commodo elit erat nec turpis. Ut pharetra augue nec augue. Nam elit agna, endrerit sit amet, tincidunt ac, viverra sed, nulla. Donec porta diam eu massa. Quisque diam lorem, interdum vitae, dapibus ac, scelerisque vitae, pede.`
