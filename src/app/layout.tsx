// app/layout.tsx

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AuthProvider from '@/components/auth/AuthProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Eventilize - Event Guest Management System',
  description: 'Streamline your event guest management with our comprehensive platform',
  keywords: 'event management, guest registration, QR codes, check-in, seating arrangements',
  authors: [{ name: 'Eventilize Team' }],
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className={inter.className}>
        <AuthProvider> {/* <-- Use your new client component here */}
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}