// layout.tsx

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
      <body>
          {children}
      </body>
    </html>
  )
}