'use client'
import { useState } from 'react'
import { Globe } from 'lucide-react'
import { useLanguage } from '@/app/providers'

export default function LanguageSwitcher() {
  const { lang, setLanguage, languages } = useLanguage()
  const [open, setOpen] = useState(false)

  const currentLang = languages.find(l => l.code === lang)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-700 rounded-lg text-white hover:bg-slate-600 transition text-sm"
      >
        <Globe size={16} />
        <span>{currentLang?.flag} {currentLang?.name}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-xl border border-white/10 shadow-xl z-50 max-h-60 overflow-y-auto">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLanguage(l.code); setOpen(false) }}
              className={`w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 transition flex items-center gap-2 ${
                l.code === lang ? 'text-blue-400 bg-blue-500/10' : 'text-white'
              }`}
            >
              <span>{l.flag}</span>
              <span>{l.name}</span>
              {l.code === lang && <span className="ml-auto text-blue-400">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}