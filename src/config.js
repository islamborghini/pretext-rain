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

// Rain intensity presets: { droplets, impactChance, splashCount }
export const RAIN_PRESETS = {
  light:  { count: 40,  impactChance: 0.02, splash: 3 },
  medium: { count: 100, impactChance: 0.04, splash: 5 },
  heavy:  { count: 200, impactChance: 0.07, splash: 8 },
  storm:  { count: 350, impactChance: 0.10, splash: 10 },
}
export const RAIN_DEFAULT_INTENSITY = 'medium'

// Rain
export const RAIN_COUNT = 100 // overridden at runtime by intensity
export const RAIN_MIN_SPEED = 500
export const RAIN_MAX_SPEED = 900
export const RAIN_MIN_LENGTH = 12
export const RAIN_MAX_LENGTH = 28
export const RAIN_COLOR_R = 170
export const RAIN_COLOR_G = 200
export const RAIN_COLOR_B = 255
export const RAIN_BASE_OPACITY = 0.35

// Splash particles
export const SPLASH_COUNT = 5
export const SPLASH_SPEED = 130
export const SPLASH_LIFE = 0.4
export const SPLASH_RADIUS = 1.5

// Ripple impacts — radial force on characters
export const IMPACT_FORCE = 18000
export const IMPACT_RADIUS = 120
export const IMPACT_MAX_ACTIVE = 8
export const IMPACT_MIN_INTERVAL = 150

// Character physics — underdamped for fluid oscillation
export const CHAR_SPRING = 55       // spring constant pulling back to rest
export const CHAR_DAMPING = 3.5     // low damping = more sloshing
export const CHAR_MAX_DISP = 100    // max displacement from rest

// Wind
export const WIND_MAX_STRENGTH = 220
export const WIND_LERP = 0.025
export const TEXT_LEAN_FACTOR = 0.10
export const TEXT_SKEW_FACTOR = 0.03

// Fog
export const FOG_COUNT = 20

// The paragraph text
export const PARAGRAPH_TEXT = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer in mauris eu nibh euismod gravida. Duis ac tellus et risus vulputate vehicula. Donec lobortis risus a elit. Etiam tempor. Ut ullamcorper, ligula ut dictum pharetra, nisi nunc fringilla magna, in commodo elit erat nec turpis. Ut pharetra augue nec augue. Nam elit agna, endrerit sit amet, tincidunt ac, viverra sed, nulla. Donec porta diam eu massa. Quisque diam lorem, interdum vitae, dapibus ac, scelerisque vitae, pede.`
