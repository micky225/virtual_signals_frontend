'use client'

import { ToastProvider } from '@/components/app-toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}
