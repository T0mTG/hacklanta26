// One place for every color so the 3D scene and the UI stay in the same palette.
export const palette = {
  ink: '#22333b', outline: '#1f3340', cream: '#fbf5e6', paper: '#f1e9d8',
  skyGlobe: '#5bb8b5', skyWalkTop: '#8fd3c9', skyWalkBottom: '#c5ebd9',
  grassDark: '#5fae4f', grass: '#86cd5e', grassLight: '#b3e07a',
  sand: '#ecdca4', sandWet: '#d3c58c', dirt: '#dcc58f',
  water: '#3fb6b2', waterLight: '#7fd6cf', waterDeep: '#2a8f98', foam: '#f6fbf7',
  sun: '#f2c14e', coral: '#ee6c4d', pink: '#f6a6b8', lilac: '#c9b6f2', sky: '#9ad4f5', mint: '#a8e6c3',
  wood: '#c88a54', woodDark: '#a96d3b',
  rock: '#bdb39a', rockDark: '#a69b84', mountain: '#8b6f52', snow: '#f5f2ea',
} as const

export const fonts = { display: 'Fredoka', body: 'Nunito', hand: 'Caveat' }

// Sticky note colors, also used by the note composer.
export const NOTE_COLORS = ['#ffe27a', '#ffb3c6', '#b8f0c8', '#b9e3ff', '#d9c6ff'] as const
