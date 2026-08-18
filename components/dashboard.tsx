'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { ArrowUp, BarChart3, Clock3, Package, Send, Shield, Zap } from 'lucide-react'
import { fetchMe, firstName, initials, readUser, type GameKey, type PaymentKind, type SessionUser } from '@/lib/api'

const PredictionPaymentModal = dynamic(
  () => import('@/components/payment-flow').then((mod) => mod.PredictionPaymentModal),
  { ssr: false },
)

const games = [
  {
    key: 'football' as const,
    tag: 'INSTANT VIRTUALS',
    title: 'Instant Football',
    text: 'Upload a screenshot and get instant AI predictions.',
    action: 'GET PREDICTIONS',
    icon: ArrowUp,
    image: '/games/football-crest.png',
    alt: 'Sporty Instant Football',
  },
  {
    key: 'bottle' as const,
    tag: 'SPIN THE BOTTLE',
    title: 'Spin the Bottle',
    text: 'AI-powered UP/DOWN signals with high accuracy.',
    action: 'GENERATE SIGNALS',
    icon: BarChart3,
    image: '/games/bottle-mark.png',
    alt: "Spin da' Bottle",
  },
]

export default function Dashboard() {
  const router = useRouter()
  const [me, setMe] = useState<SessionUser | null>(readUser())
  const [payGame, setPayGame] = useState<PaymentKind | null>(null)
  const [waiting, setWaiting] = useState<string | null>(null)

  const refresh = useCallback(async (force = false) => {
    try {
      setMe(await fetchMe(force))
    } catch {
      router.push('/')
    }
  }, [router])

  const waitingOnAdmin = Boolean(me && (!me.registrationApproved || (me.pendingPayments || []).length > 0))

  useEffect(() => {
    refresh()
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  useEffect(() => {
    if (!waitingOnAdmin) return
    const timer = window.setInterval(() => refresh(true), 30000)
    return () => window.clearInterval(timer)
  }, [waitingOnAdmin, refresh])

  const name = firstName(me?.name || me?.email?.split('@')[0] || 'there')
  const mark = initials(me?.name || '', me?.email || '')
  const pendingKinds = useMemo(() => new Set((me?.pendingPayments || []).map((item) => item.kind)), [me?.pendingPayments])

  const openGame = (key: GameKey) => {
    if (me?.unlocked?.[key]) {
      router.push(`/dashboard/${key}`)
      return
    }
    if (!me?.registrationApproved) {
      setWaiting('Your registration payment is waiting for admin confirmation. Access opens after an admin approves it.')
      return
    }
    if (pendingKinds.has(key)) {
      setWaiting('This package payment is waiting for admin confirmation. You will get access after an admin approves it.')
      return
    }
    setPayGame(key)
  }

  return (
    <div className="dash-page">
      <header className="dash-header">
        <div className="dash-brand">
          <span className="dash-logo"><Zap size={16} fill="currentColor" /></span>
          <strong>VITAULS<b>SIGNALS</b></strong>
        </div>
        <div className="dash-head-actions">
          {me?.isAdmin && (
            <button type="button" className="dash-admin" onClick={() => router.push('/dashboard/admin')}>
              <Shield size={14} /> Admin
            </button>
          )}
          <span className="dash-avatar" aria-label="Account">{mark}</span>
        </div>
      </header>

      <h1>Welcome, <em>{name}</em></h1>
      <p className="dash-sub">Choose a game and let AI predict for you.</p>

      {!me?.registrationApproved && (
        <div className="dash-wait" role="status">
          <Clock3 size={18} />
          <div>
            <b>Waiting for admin confirmation</b>
            <span>
              {pendingKinds.has('registration')
                ? 'Your registration payment has been received. Please wait for an admin to confirm it before you get access.'
                : 'Finish your registration payment, then wait for an admin to confirm it before you get access.'}
            </span>
          </div>
        </div>
      )}

      <button className="dash-packages" type="button" onClick={() => setPayGame(me?.registrationApproved ? 'diamonds' : 'registration')}><Package size={16} /> {me?.registrationApproved ? 'BUY PACKAGES' : 'COMPLETE PAYMENT'}</button>

      <div className="dash-games">
        {games.map((game) => {
          const Icon = game.icon
          const unlocked = Boolean(me?.unlocked?.[game.key])
          const pending = pendingKinds.has(game.key)
          return (
            <article className="dash-game" key={game.key}>
              <span className="dash-tag">{game.tag}</span>
              <div className="dash-game-row">
                <div className="dash-game-copy">
                  <h2>{game.title}</h2>
                  <p>{game.text}</p>
                </div>
                <div className="dash-visual">
                  <img src={game.image} alt={game.alt} loading="lazy" decoding="async" />
                </div>
              </div>
              <button type="button" onClick={() => openGame(game.key)}>
                <Icon size={16} /> {unlocked ? game.action : pending ? 'WAITING FOR ADMIN' : game.action}
              </button>
            </article>
          )
        })}
      </div>

      <button className="dash-support" type="button"><Send size={15} /> SUPPORT CHAT</button>
      {payGame && (
        <PredictionPaymentModal
          email={me?.email || ''}
          kind={payGame}
          onClose={() => setPayGame(null)}
          onSubmitted={() => {
            setPayGame(null)
            setWaiting('Payment submitted. Please wait for an admin to confirm it before you get access.')
            refresh(true)
          }}
        />
      )}
      {waiting && (
        <div className="modal-backdrop" role="presentation" onClick={() => setWaiting(null)}>
          <section className="auth-modal wait-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <Clock3 size={28} />
            <h2>PLEASE WAIT</h2>
            <p>{waiting}</p>
            <button className="button button-primary auth-submit" type="button" onClick={() => setWaiting(null)}>OK</button>
          </section>
        </div>
      )}
    </div>
  )
}
