import type { Metadata } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { VisualThemeProvider } from '@/components/VisualThemeProvider'
import './globals.css'

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter"
});

const geistMono = Geist_Mono({ 
  subsets: ["latin"],
  variable: "--font-geist-mono"
});

export const metadata: Metadata = {
  title: 'ColabSocial - Transforme Colaboração em Participação',
  description: 'A ColabSocial conecta ideias, talentos e oportunidades para transformar colaboração em MVPs, produtos e novas startups, usando o ColabScore.',
  generator: 'v0.app',
  keywords: ['startup', 'colaboração', 'inovação', 'MVP', 'ColabScore', 'empreendedorismo'],
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${geistMono.variable} bg-background`}>
      <body className="font-sans antialiased">
        <VisualThemeProvider>{children}</VisualThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
