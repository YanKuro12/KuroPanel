export const themes = {
  dark: {
    background: 'bg-slate-900',
    card: 'bg-slate-800',
    cardHover: 'hover:bg-slate-700',
    border: 'border-slate-700',
    text: 'text-white',
    textSecondary: 'text-slate-400',
    accent: 'bg-blue-600',
    accentHover: 'hover:bg-blue-700',
  },
  light: {
    background: 'bg-gray-100',
    card: 'bg-white',
    cardHover: 'hover:bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-900',
    textSecondary: 'text-gray-500',
    accent: 'bg-blue-500',
    accentHover: 'hover:bg-blue-600',
  },
  cyber: {
    background: 'bg-black',
    card: 'bg-gray-900',
    cardHover: 'hover:bg-gray-800',
    border: 'border-green-500/30',
    text: 'text-green-400',
    textSecondary: 'text-green-600',
    accent: 'bg-green-600',
    accentHover: 'hover:bg-green-700',
  },
}

let currentTheme = 'dark'

export function setTheme(theme) {
  if (themes[theme]) {
    currentTheme = theme
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme)
      document.documentElement.className = theme
    }
  }
}

export function getTheme() {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('theme')
    if (saved && themes[saved]) {
      currentTheme = saved
    }
  }
  return currentTheme
}

export function useTheme() {
  return { theme: getTheme(), setTheme, themes }
}