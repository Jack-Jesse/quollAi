import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'M E R G E — Underground Skate Conspiracy',
  description: 'A digital transmission from the depths. The merge has already begun.',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="xerox-texture">
        {children}
      </body>
    </html>
  )
}
