import type { Metadata } from 'next'
import { Cormorant_Garamond, Outfit } from 'next/font/google'
import './globals.css'

// Luxury editorial serif — headlines
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
})

// Clean modern geometric — body
const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Estateline — Real Estate CRM',
  description: 'Multi-tenant CRM for real estate agencies in the Balkans',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${cormorant.variable} ${outfit.variable} h-full overflow-hidden`}>
      <body className="font-body h-full overflow-hidden">
        {children}
      </body>
    </html>
  )
}
