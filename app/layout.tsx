import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Space_Grotesk } from 'next/font/google'
import { Providers } from '@/components/providers'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space', display: 'swap' })

export const metadata: Metadata = {
  title: 'Vitauls Signals — AI-powered football predictions',
  description: 'Turn your virtual football tickets into smarter picks with Vitauls Signals AI analysis.',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#07090b',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${spaceGrotesk.variable}`}>
      <body className="antialiased">
        <Providers>
          {children}
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </Providers>
      </body>
    </html>
  )
}
