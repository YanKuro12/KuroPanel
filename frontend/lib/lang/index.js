import en from './en'
import id from './id'
import zh from './zh'
import fr from './fr'
import ja from './ja'
import es from './es'
import ru from './ru'
import ar from './ar'
import pt from './pt'
import de from './de'
import ko from './ko'

const translations = { en, id, zh, fr, ja, es, ru, ar, pt, de, ko }

const languageNames = {
  en: 'English',
  id: 'Bahasa Indonesia',
  zh: '中文',
  fr: 'Français',
  ja: '日本語',
  es: 'Español',
  ru: 'Русский',
  ar: 'العربية',
  pt: 'Português',
  de: 'Deutsch',
  ko: '한국어',
}

const languageFlags = {
  en: '🇺🇸',
  id: '🇮🇩',
  zh: '🇨🇳',
  fr: '🇫🇷',
  ja: '🇯🇵',
  es: '🇪🇸',
  ru: '🇷🇺',
  ar: '🇸🇦',
  pt: '🇧🇷',
  de: '🇩🇪',
  ko: '🇰🇷',
}

let currentLang = 'en'

export function setLanguage(lang) {
  if (translations[lang]) {
    currentLang = lang
    if (typeof window !== 'undefined') {
      localStorage.setItem('lang', lang)
    }
  }
}

export function getLanguage() {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('lang')
    if (saved && translations[saved]) {
      currentLang = saved
    }
  }
  return currentLang
}

export function t(key) {
  const lang = getLanguage()
  return translations[lang]?.[key] || translations.en[key] || key
}

export function getAvailableLanguages() {
  return Object.keys(translations).map(code => ({
    code,
    name: languageNames[code] || code,
    flag: languageFlags[code] || '🏳️',
  }))
}

export function useT() {
  return { t, setLanguage, getLanguage, getAvailableLanguages }
}