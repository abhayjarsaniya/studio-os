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

/**
 * Global Responsive Typography Tokens
 * Meets strict requirements:
 * - Mobile: comfortable reading without zoom, inputs >= 16px, labels 14-15px
 * - Desktop: balanced hierarchy, no oversized headings, compact but readable tables
 * - Minimum font size: strictly >= 12px everywhere (no tiny 9-11px text)
 * - Clear hierarchy with proper font weights and line heights
 */
export const TYPOGRAPHY = {
  // Main page headings: Mobile 22-26px, Desktop 28-32px
  pageTitle: 'text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 leading-tight',
  
  // Section headings: Mobile 19-21px, Desktop 22-24px
  sectionTitle: 'text-lg sm:text-xl font-bold tracking-tight text-zinc-900 leading-snug',
  
  // Card headings: Mobile 17-19px, Desktop 18-20px
  cardTitle: 'text-base sm:text-lg font-bold text-zinc-900 leading-snug',
  
  // Regular body text: 15-16px
  body: 'text-[15px] sm:text-base text-zinc-700 leading-normal',
  bodyMedium: 'text-[15px] sm:text-base font-medium text-zinc-800 leading-normal',
  bodyBold: 'text-[15px] sm:text-base font-bold text-zinc-900 leading-normal',
  
  // Secondary text: 13-14px
  secondary: 'text-xs sm:text-sm text-zinc-500 leading-normal',
  secondaryMedium: 'text-xs sm:text-sm font-medium text-zinc-600 leading-normal',
  
  // Form labels: 14-15px
  label: 'text-sm font-semibold text-zinc-700 leading-snug',
  labelRequired: 'text-sm font-semibold text-zinc-700 leading-snug after:content-["*"] after:ml-0.5 after:text-rose-500',
  
  // Input text: Mobile 16px (prevents browser auto-zoom), Desktop 15-16px
  input: 'text-base sm:text-[15px] text-zinc-900 leading-normal',
  
  // Button text: 15-16px
  button: 'text-[15px] sm:text-base font-bold leading-none',
  buttonSm: 'text-xs sm:text-sm font-semibold leading-none',
  
  // Navigation labels: Mobile 12-14px, Desktop 13-14px
  nav: 'text-xs sm:text-[13.5px] font-semibold leading-snug',
  
  // Table typography: minimum 14px content, 12-13px uppercase headers
  tableCell: 'text-sm font-medium text-zinc-800 leading-normal',
  tableHeader: 'text-xs font-bold text-zinc-500 uppercase tracking-wider leading-tight',
  
  // Calendar typography: date numbers 15-17px, event titles 13-15px
  calendarDate: 'text-[15px] sm:text-base md:text-[17px] font-bold leading-none',
  calendarEvent: 'text-[13px] sm:text-sm font-semibold leading-snug',
  
  // Status badges: minimum 12px
  badge: 'text-xs font-bold tracking-wide uppercase',
  
  // Small metadata / captions: minimum 12px
  caption: 'text-xs text-zinc-500 font-medium leading-normal',
  captionMuted: 'text-xs text-zinc-400 font-medium leading-normal',
  captionMono: 'text-xs font-mono font-medium text-zinc-500 leading-normal'
};
