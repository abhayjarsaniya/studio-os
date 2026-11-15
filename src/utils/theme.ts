/**
 * STUDIO OS — Centralized Orange Theme & Design System
 * 
 * Replaces the previous dark/black styling across all 3 portals:
 * 1. Master Admin
 * 2. Studio Owner (Shreeji Films & Photography)
 * 3. Employee Workspace
 * 
 * Direction: Vibrant medium-orange with soft shine & subtle gradients,
 * warm light highlights, clean white cards and dark charcoal typography.
 */

export const THEME = {
  // Brand colors
  colors: {
    primary: '#ea580c', // orange-600
    primaryLight: '#f97316', // orange-500
    primaryDark: '#c2410c', // orange-700
    primaryAccent: '#f59e0b', // amber-500
    surfaceLight: '#fff7ed', // orange-50
    surfaceBorder: '#fed7aa', // orange-200
    textPrimary: '#18181b', // zinc-900
    textSecondary: '#71717a', // zinc-500
    backgroundWarm: '#fafaf9', // warm light neutral
  },

  // Button styles
  button: {
    // Primary Shiny Medium-Orange with soft gradient and light border highlight
    primary:
      'bg-gradient-to-r from-orange-500 via-orange-500 to-amber-600 hover:from-orange-600 hover:via-orange-600 hover:to-amber-700 text-white font-bold shadow-sm shadow-orange-500/25 border border-orange-400/30 active:scale-[0.98] transition-all cursor-pointer touch-manipulation',
    
    // Light Orange Secondary
    secondary:
      'bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200/90 font-bold active:scale-[0.98] transition-all cursor-pointer touch-manipulation',

    // Clean Neutral with Orange Hover
    outline:
      'bg-white hover:bg-orange-50/60 text-zinc-700 hover:text-orange-900 border border-zinc-200 hover:border-orange-200/90 font-semibold active:scale-[0.98] transition-all cursor-pointer touch-manipulation',

    // Action pill
    pill:
      'bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 font-bold rounded-xl transition-all cursor-pointer touch-manipulation'
  },

  // Active / Selected states
  active: {
    navItem:
      'bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold shadow-xs',
    tab:
      'bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold shadow-xs',
    subtleTab:
      'bg-orange-50 text-orange-900 border-b-2 border-orange-600 font-bold',
    badge:
      'bg-orange-50 text-orange-800 border border-orange-200 font-bold',
    filterPill:
      'bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold shadow-xs'
  },

  // Calendar specific design tokens
  calendar: {
    activeDay:
      'border-orange-500 bg-orange-50/70 ring-2 ring-orange-500/40 text-orange-950 font-black',
    todayDay:
      'border-orange-400 bg-orange-50/30 text-orange-800',
    selectedDayIndicator:
      'w-2 h-2 rounded-full bg-orange-500',
    navButton:
      'min-w-[48px] min-h-[48px] w-12 h-12 rounded-xl border border-zinc-200 bg-white hover:bg-orange-50 hover:border-orange-300 text-zinc-700 hover:text-orange-600 flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-xs'
  }
};
