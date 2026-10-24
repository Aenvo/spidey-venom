// Shared material, physics and abilities; the renderer does not choose characters.
const SUIT_COLORS = {
  blue: [0.018, 0.085, 0.52], red: [0.58, 0.012, 0.022],
  blueWeb: [0.004, 0.012, 0.07], redWeb: [0.07, 0.002, 0.006],
  black: [0.0015, 0.002, 0.004], ink: [0.012, 0.012, 0.016],
  silver: [0.9, 0.91, 0.94], silk: [0.8, 0.81, 0.84],
  labelGray: [0.36, 0.38, 0.42],
};
const BUTTON_LABEL_STYLE = { font: 'Geist', weight: 700, letterSpacing: 10 };
const WEB_SILK = { thickness: 1, slither: 0.3, whip: 1.45, magnet: 1.1, gravity: 380, creep: 0.12, snapStretch: 1.9, maxLen: 172, grip: 1.25 };
const ELECTRIC_SILK = { ...WEB_SILK, reach: 155, awareness: 260, maxLen: 235, sheen: 0.12 };
const SPIDER_SUIT = {
  base: SUIT_COLORS.blue, accent: SUIT_COLORS.red,
  web: SUIT_COLORS.blueWeb, webAccent: SUIT_COLORS.redWeb,
  strand: SUIT_COLORS.silk, webStrength: 0.75, webWidth: 0.3, panel: true,
  pulse: { amount: 0.1, speed: 1.1 },
};
const BUTTON_THEMES = {
  spidey: {
    label: 'SPIDEY', emblem: 'spider', suit: SPIDER_SUIT,
    iconColor: SUIT_COLORS.ink, labelColor: SUIT_COLORS.ink,
    canBeInfected: true, purgeRate: 1.8, targets: ['venom'], params: WEB_SILK, shotRadius: 1.45,
    aria: 'Spidey: tap to shoot a web, drag or use arrow keys to move',
  },
  venom: {
    label: 'VENOM', emblem: 'venom', suit: null,
    iconColor: SUIT_COLORS.silver, labelColor: SUIT_COLORS.silver,
    canBeInfected: false, infects: true, targets: ['spidey', 'miles'], shotRadius: 1.75,
    params: { sheen: 0.55, slither: 1.25, magnet: 1.8, thickness: 1.05 },
    shockResponse: { height: 15, count: 28 },
    aria: 'Venom: tap to unleash the symbiote, drag or use arrow keys to move',
  },
  miles: {
    label: 'MILES', emblem: 'spider',
    suit: { ...SPIDER_SUIT, base: SUIT_COLORS.black, accent: SUIT_COLORS.black,
      web: SUIT_COLORS.red, webAccent: SUIT_COLORS.red, webWidth: 0.15, webStrength: 0.1, panel: false },
    iconColor: SUIT_COLORS.red, labelColor: SUIT_COLORS.labelGray, labelPolish: 0,
    canBeInfected: false, targets: [], shotRadius: 1.45,
    params: ELECTRIC_SILK,
    electricity: { color: '#39baff', core: '#def6ff', width: 0.6, jitter: 0.35,
      wrapRadius: 1.5, frequency: 0.5, packetLength: 0.14,
      flashDuration: [70, 130], flashPause: [550, 1400],
      combatFlash: { duration: [90, 160], pause: [60, 180], count: 3, hold: 220 },
      interval: 45, burstDuration: 1100, beamDuration: 650, maxPaths: 6,
      triggerRange: ELECTRIC_SILK.reach,
      knockback: { distance: 100, cooldown: 1400 },
      rescueRange: 180, rescueComplete: 0.003, rescueMinDuration: 650, transferDelay: 180,
      attackRange: ELECTRIC_SILK.maxLen, contactTolerance: 7, attackInterval: 260, shockDuration: 320 },
    aria: 'Miles: electric webs, immune to Venom; tap, drag or use arrow keys to move',
  },
};
const COMBAT = { reach: 100, release: 150, inset: 5, knockbackDamping: 8, settleSpeed: 8 };
