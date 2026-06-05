import type { Metadata } from 'next'
import './globals.css'
import { Geist } from 'next/font/google'
import { cn } from '@web/lib/utils'
import { QueryProvider } from '@web/components/providers/QueryProvider'
import { DemoActorSwitcher } from '@web/components/shared/DemoActorSwitcher'

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'CrewMate',
  description: 'Field service operations platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', geist.variable)}>
      <body>
        <QueryProvider>{children}</QueryProvider>
        <DemoActorSwitcher />
      </body>
    </html>
  )
}
