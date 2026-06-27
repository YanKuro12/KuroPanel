'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { getLanguage, setLanguage, t as translate, getAvailableLanguages } from '@/lib/lang'

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en')

  useEffect(() => {
    setLang(getLanguage())
  }, [])

  const changeLanguage = (code) => {
    setLanguage(code)
    setLang(code)
  }

  const t = (key) => translate(key)

  return (
    <LanguageContext.Provider value={{ lang, setLanguage: changeLanguage, t, languages: getAvailableLanguages() }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}