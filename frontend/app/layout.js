import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { LanguageProvider } from './providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'KuroPanel',
  description: 'Infrastructure Management Panel',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <LanguageProvider>
          {children}
          <Toaster position="top-right" theme="dark" richColors />
        </LanguageProvider>
      </body>
    </html>
  )
}