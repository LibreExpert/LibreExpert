// layout.tsx

import './globals.css'

export const metadata = {
  title: 'My Next JS App',
  description: 
    'Migrating from create-react-app to NextJS : a practical guide',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <div className="relative flex min-h-screen flex-col">
          {children}
        </div>
      </body>
    </html>
  )
}