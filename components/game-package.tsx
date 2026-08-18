'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Clock3, FileScan, Gem, ImagePlus, LoaderCircle, Lock, ScanLine, Sparkles, Trash2, Upload, Zap } from 'lucide-react'
import { clearPredictions, fetchMe, fetchPredictions, readUser, runPrediction, type GameKey, type HistoryItem, type MatchPick, type SessionUser, type SignalPick } from '@/lib/api'
import { useToast } from '@/components/app-toast'
import { teamMark, teamTone } from '@/lib/predictions'

const PredictionPaymentModal = dynamic(
  () => import('@/components/payment-flow').then((mod) => mod.PredictionPaymentModal),
  { ssr: false },
)

const PREDICTION_COST = 50

const copy = {
  football: {
    title: 'Instant Football',
    how: [
      'Upload your SportyBet virtual football screenshot',
      'AI scans and detects all teams automatically',
      'Receive AI-powered match predictions instantly',
    ],
  },
  bottle: {
    title: 'Spin the Bottle',
    how: [
      'Upload your Spin the Bottle screenshot',
      'AI reads the current UP / DOWN market',
      'Receive high-accuracy signals instantly',
    ],
  },
} as const

function Diamond({ size = 14 }: { size?: number }) {
  return <Gem size={size} fill="currentColor" />
}

async function compactScreenshot(file: File) {
  if (!file.type.startsWith('image/') || typeof createImageBitmap !== 'function') return file
  try {
    const bitmap = await createImageBitmap(file)
    const max = 1280
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    if (scale === 1 && file.size < 450_000 && file.type === 'image/jpeg') {
      bitmap.close()
      return file
    }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.72))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
  } catch {
    return file
  }
}

export default function GamePackage({ game }: { game: GameKey }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [email, setEmail] = useState(() => readUser()?.email || '')
  const [me, setMe] = useState<SessionUser | null>(() => readUser())
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [view, setView] = useState<'upload' | 'results'>('upload')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  const [waitNote, setWaitNote] = useState('')
  const [current, setCurrent] = useState<HistoryItem | null>(null)
  const notify = useToast()

  const meta = copy[game]
  const diamonds = me?.diamonds || 0

  const takeFile = useCallback(async (next: File | null) => {
    if (!next) return
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(next.type)) return setError('Use a PNG, JPG, or JPEG screenshot.')
    if (next.size > 8 * 1024 * 1024) return setError('Screenshot must be 8MB or smaller.')
    const compact = await compactScreenshot(next)
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(compact)
    })
    setError('')
    setFile(compact)
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const user = await fetchMe()
        if (cancelled) return
        setEmail(user.email || readUser()?.email || '')
        setMe(user)
        if (!user.unlocked?.[game]) {
          router.replace('/dashboard')
          return
        }
        try {
          const rows = await fetchPredictions(game)
          if (!cancelled) setHistory(rows.slice(0, 20))
        } catch {
          if (!cancelled) setHistory([])
        }
      } catch {
        if (!cancelled) router.replace('/')
      }
    }
    load()
    return () => { cancelled = true }
  }, [game, router])

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const fromFiles = [...(event.clipboardData?.files || [])].find((item) => item.type.startsWith('image/'))
      const fromItems = [...(event.clipboardData?.items || [])].map((item) => item.getAsFile()).find((item) => item?.type.startsWith('image/'))
      const image = fromFiles || fromItems || null
      if (image) {
        event.preventDefault()
        takeFile(image)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [takeFile])

  const removeFile = () => {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null)
    setPreview('')
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const analyze = async () => {
    if (!file) return setError('Select or paste a screenshot first.')
    if ((diamonds || 0) < PREDICTION_COST) {
      const message = 'Not enough diamonds. Buy a package to continue.'
      setError(message)
      notify({ title: 'Not enough diamonds', message, tone: 'error' })
      return
    }
    setBusy(true)
    setError('')
    try {
      const data = await runPrediction(game, file)
      const item: HistoryItem = {
        id: String(data.id),
        game,
        at: Date.now(),
        cost: PREDICTION_COST,
        football: game === 'football' ? (data.predictions as MatchPick[]) : undefined,
        bottle: game === 'bottle' ? (data.predictions as SignalPick[]) : undefined,
      }
      setMe((current) => current ? { ...current, diamonds: data.diamonds } : current)
      setHistory((rows) => [item, ...rows])
      setCurrent(item)
      notify({
        title: 'Predictions ready',
        message: <>{PREDICTION_COST} <Diamond size={11} /> deducted from your wallet.</>,
      })
      setView('results')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Prediction failed.'
      setError(message)
      notify({ title: 'Prediction failed', message, tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const openHistory = (item: HistoryItem) => {
    setCurrent(item)
    setView('results')
  }

  if (!me) return <div className="pkg-page" />

  return (
    <div className="pkg-page">
      <header className="pkg-head">
        <button type="button" className="pkg-back" onClick={() => view === 'results' ? setView('upload') : router.push('/dashboard')} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div>
          <strong>Upload VGames Screenshot</strong>
          <em>{meta.title}</em>
        </div>
        <span className="pkg-chip"><Diamond /> {diamonds}</span>
      </header>

      {view === 'upload' ? (
        <>
          {waitNote && <p className="dash-wait" role="status"><Clock3 size={16} /><span>{waitNote}</span></p>}
          <section className="pkg-wallet">
            <div>
              <span>DIAMOND WALLET</span>
              <b>{diamonds} <Diamond size={22} /></b>
              <small><Diamond size={12} /> {PREDICTION_COST} per prediction</small>
            </div>
            <button type="button" onClick={() => setPayOpen(true)}>BUY <Diamond size={14} /></button>
          </section>

          {file ? (
            <p className="pkg-ready"><ScanLine size={16} /> Screenshot ready — tap Get Prediction</p>
          ) : (
            <p className="pkg-hint"><ScanLine size={16} /> Select a file or paste a screenshot</p>
          )}

          <label
            className={file ? 'pkg-drop has-file' : 'pkg-drop'}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              takeFile(event.dataTransfer.files[0] || null)
            }}
          >
            {preview ? <img src={preview} alt="Selected screenshot" decoding="async" /> : <div className="pkg-empty"><ImagePlus size={36} /><b>Drop or paste screenshot</b></div>}
            <strong>{file ? 'Screenshot selected' : 'No screenshot yet'}</strong>
            <span>{file?.name || 'PNG, JPG, JPEG — max 8MB'}</span>
            <small>PNG, JPG, JPEG — max 8MB</small>
            <button type="button" className="pkg-select" onClick={(event) => { event.preventDefault(); inputRef.current?.click() }}>
              <Upload size={15} /> Select File
            </button>
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => takeFile(event.target.files?.[0] || null)} />
          </label>

          {error && <p className="pkg-error">{error}</p>}

          {file && (
            <button type="button" className="pkg-remove" onClick={removeFile}>Remove screenshot</button>
          )}

          <button type="button" className="pkg-analyze" disabled={!file || busy} onClick={analyze}>
            {busy ? <LoaderCircle size={16} className="pkg-spin" /> : <Zap size={16} fill="currentColor" />}
            {busy ? 'ANALYZING…' : 'GET PREDICTION'}
          </button>
        </>
      ) : (
        <Results
          game={game}
          how={meta.how}
          current={current}
          history={history}
          onClear={async () => { await clearPredictions(game); setHistory([]); setCurrent(null) }}
          onOpen={openHistory}
        />
      )}

      {payOpen && (
        <PredictionPaymentModal
          email={email}
          kind="diamonds"
          onClose={() => setPayOpen(false)}
          onSubmitted={() => {
            setPayOpen(false)
            setWaitNote('Diamond top-up submitted. Please wait for an admin to confirm it before diamonds are added.')
            notify({ title: 'Payment submitted', message: 'Admin will add diamonds after confirming this payment.', tone: 'info' })
          }}
        />
      )}
    </div>
  )
}

function Results({
  game,
  how,
  current,
  history,
  onClear,
  onOpen,
}: {
  game: GameKey
  how: readonly string[]
  current: HistoryItem | null
  history: HistoryItem[]
  onClear: () => void
  onOpen: (item: HistoryItem) => void
}) {
  const football = current?.football || []
  const bottle = current?.bottle || []
  const count = game === 'football' ? football.length : bottle.length

  return (
    <>
      <section className="pkg-how">
        <span>HOW IT WORKS</span>
        {how.map((step, index) => (
          <p key={step}><i>{index === 0 ? <FileScan size={14} /> : index === 1 ? <ScanLine size={14} /> : <Sparkles size={14} />}</i>{step}</p>
        ))}
      </section>
      <p className="pkg-lock"><Lock size={13} /> Manual entry unlocks automatically if screenshot detection fails.</p>

      <h2 className="pkg-section">YOUR PREDICTIONS ({count})</h2>
      {game === 'football' && football.map((pick) => <MatchCard key={`${pick.home}-${pick.away}`} pick={pick} />)}
      {game === 'bottle' && bottle.map((pick) => <SignalCard key={pick.round} pick={pick} />)}
      {count === 0 && <p className="pkg-empty-copy">No predictions in this batch.</p>}

      <div className="pkg-hist-head">
        <h2 className="pkg-section">PREDICTION HISTORY ({history.length})</h2>
        <button type="button" onClick={onClear}><Trash2 size={13} /> Clear</button>
      </div>
      {history.slice(0, 20).map((item) => (
        <button type="button" className="pkg-hist" key={item.id} onClick={() => onOpen(item)}>
          <Clock3 size={16} />
          <span>{new Date(item.at).toLocaleString()}</span>
          <em>{(item.football || item.bottle || []).length} • {item.cost} <Diamond size={11} /></em>
        </button>
      ))}
    </>
  )
}

function MatchCard({ pick }: { pick: MatchPick }) {
  return (
    <article className="pkg-match">
      <div className="pkg-teams">
        <span className="pkg-crest" style={{ background: teamTone(pick.home) }}>{teamMark(pick.home)}</span>
        <b>{pick.home} <small>vs</small> {pick.away}</b>
        <span className="pkg-crest" style={{ background: teamTone(pick.away) }}>{teamMark(pick.away)}</span>
      </div>
      <div className="pkg-pick">
        <strong>{pick.pick}</strong>
        <em>{pick.confidence}%</em>
      </div>
    </article>
  )
}

function SignalCard({ pick }: { pick: SignalPick }) {
  return (
    <article className="pkg-match">
      <div className="pkg-teams">
        <b>{pick.round}</b>
      </div>
      <div className="pkg-pick">
        <strong className={pick.pick === 'UP' ? 'up' : 'down'}>{pick.pick}</strong>
        <em>{pick.confidence}%</em>
      </div>
    </article>
  )
}
