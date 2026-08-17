'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertCircle, Check, Info } from 'lucide-react'
import { TOKEN_KEY, fetchMe, type SessionUser } from '@/lib/api'

export type ToastTone = 'success' | 'error' | 'info'

export type ToastInput = {
  title: string
  message?: ReactNode
  tone?: ToastTone
}

type ToastItem = ToastInput & { id: number; tone: ToastTone }

const ToastContext = createContext<(toast: ToastInput) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const snapshot = useRef<SessionUser | null>(null)

  const notify = useCallback((toast: ToastInput) => {
    const id = Date.now() + Math.random()
    const next: ToastItem = { tone: 'success', ...toast, id }
    setItems((rows) => [...rows.slice(-2), next])
    window.setTimeout(() => setItems((rows) => rows.filter((row) => row.id !== id)), 4800)
  }, [])

  useEffect(() => {
    const watch = async () => {
      if (!window.localStorage.getItem(TOKEN_KEY)) {
        snapshot.current = null
        return
      }
      try {
        const me = await fetchMe()
        const before = snapshot.current
        snapshot.current = me
        if (!before) return
        announceAccessChanges(before, me, notify)
      } catch {
        snapshot.current = null
      }
    }
    watch()
    const timer = window.setInterval(watch, 8000)
    return () => window.clearInterval(timer)
  }, [notify])

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="app-toasts" aria-live="polite" aria-relevant="additions">
        {items.map((item) => (
          <article className={`app-toast ${item.tone}`} key={item.id} role="status">
            <span className="app-toast-icon">
              {item.tone === 'error' ? <AlertCircle size={14} /> : item.tone === 'info' ? <Info size={14} /> : <Check size={14} />}
            </span>
            <div>
              <b>{item.title}</b>
              {item.message ? <small>{item.message}</small> : null}
            </div>
          </article>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function announceAccessChanges(before: SessionUser, after: SessionUser, notify: (toast: ToastInput) => void) {
  const diamondGain = (after.diamonds || 0) - (before.diamonds || 0)
  const footballNow = !before.unlocked?.football && Boolean(after.unlocked?.football)
  const bottleNow = !before.unlocked?.bottle && Boolean(after.unlocked?.bottle)

  if (!before.registrationApproved && after.registrationApproved) {
    notify({ title: 'Payment approved', message: 'Admin confirmed your registration. You can now buy a package.' })
  }
  if (footballNow) {
    notify({ title: 'Instant Football unlocked', message: 'Admin approved your package. 200 diamonds were added.' })
  }
  if (bottleNow) {
    notify({ title: 'Spin the Bottle unlocked', message: 'Admin approved your package. 200 diamonds were added.' })
  }
  if (diamondGain >= 200 && !footballNow && !bottleNow && before.registrationApproved) {
    notify({ title: 'Diamonds added', message: `${diamondGain} diamonds were added to your wallet.` })
  }

  const stillPending = new Set((after.pendingPayments || []).map((item) => item.id))
  for (const payment of before.pendingPayments || []) {
    if (stillPending.has(payment.id)) continue
    const granted = (payment.kind === 'registration' && after.registrationApproved && !before.registrationApproved)
      || (payment.kind === 'football' && footballNow)
      || (payment.kind === 'bottle' && bottleNow)
      || (payment.kind === 'diamonds' && diamondGain > 0)
    if (!granted) {
      notify({
        title: 'Payment not approved',
        message: 'Admin rejected this payment. Check your details and submit again.',
        tone: 'error',
      })
    }
  }
}
