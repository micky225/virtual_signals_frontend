'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, Menu, MessageCircle, Play, ShieldCheck, Sparkles, Star, Upload, X, Zap } from 'lucide-react'
import { loginAccount, readUser, registerAccount, submitPayment } from '@/lib/api'
import { useToast } from '@/components/app-toast'
import { PasswordField } from '@/components/password-field'
import { CountryModal, emptyProof, FlowInput, PaymentStep, StatusStep, type PaymentCountry, type PaymentProof } from '@/components/payment-flow'

const tickerItems = ['NAP vs ARS  —  Won GHS 1,355.95', 'HDH vs SCF  —  Won GHS 848.11', 'BHA vs EVE  —  Won GHS 620.00', 'CRY vs BRE  —  Won GHS 400.00']
const testimonials = [
  { initial: 'K', name: 'Kofi B.', place: 'Accra', amount: 'GHS 600', text: 'The predictions are on point. I just follow the steps and the results speak for themselves.' },
  { initial: 'A', name: 'Ama O.', place: 'Kumasi', amount: 'GHS 400', text: 'I was skeptical at first, but this is the real deal. My first ticket won immediately.' },
  { initial: 'Y', name: 'Yaw M.', place: 'Takoradi', amount: 'GHS 800', text: 'The screenshot analysis is so easy to use. Best virtuals tool I have tried.' },
  { initial: 'A', name: 'Akosua D.', place: 'Tamale', amount: 'GHS 1000', text: 'Finally a simple way to make smarter picks. The community is great too.' },
  { initial: 'E', name: 'Elvin K.', place: 'Tema', amount: 'GHS 1,200', text: 'The signals make the whole process simple. I can see exactly why a fixture stands out.' },
  { initial: 'N', name: 'Nana A.', place: 'Cape Coast', amount: 'GHS 950', text: 'Clean, fast, and easy to understand. Vitauls Signals has become part of my routine.' },
]

export function Header() {
  const [open, setOpen] = useState(false)
  const [auth, setAuth] = useState<'login' | 'signup' | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    setIsAdmin(Boolean(readUser()?.isAdmin))
    const openSignup = () => setAuth('signup')
    window.addEventListener('instant-signup', openSignup)
    return () => window.removeEventListener('instant-signup', openSignup)
  }, [])
  return <><header className="site-header"><a className="brand" href="#top"><span className="brand-mark"><Zap size={17} fill="currentColor" /></span><span>VITAULS<span>SIGNALS</span></span></a><nav className={open ? 'nav open' : 'nav'}><a href="#how">How it works</a><a href="#reviews">Reviews</a><a href="#faq">FAQ</a></nav><div className="nav-actions">{isAdmin && <a className="nav-admin" href="/dashboard/admin">Admin</a>}<button className="nav-login" onClick={() => setAuth('login')}>Log In</button><button className="nav-signup" onClick={() => setAuth('signup')}>Sign Up <ArrowRight size={15}/></button><button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X/> : <Menu/>}</button></div></header>{auth && <AuthModal mode={auth} onClose={() => setAuth(null)} />}</>
}

function AuthModal({ mode, onClose }: { mode: 'login' | 'signup'; onClose: () => void }) {
  if (mode === 'login') return <LoginModal onClose={onClose} />
  return <SignupFlow onClose={onClose} />
}

function LoginModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const notify = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const login = async () => {
    if (!email || !password) return setError('Enter your email and password.')
    setBusy(true)
    setError('')
    try {
      await loginAccount(email, password)
      notify({ title: 'Welcome back', message: 'You are signed in. Opening your dashboard.' })
      router.push('/dashboard')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed.'
      setError(message)
      notify({ title: 'Login failed', message, tone: 'error' })
    } finally {
      setBusy(false)
    }
  }
  return <div className="modal-backdrop" role="presentation" onClick={onClose}><section className="auth-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Close"><X size={18}/></button><div className="section-label">INSTANT VIRTUALS</div><h2>WELCOME<br/><em>BACK.</em></h2><p>Log in to continue to your predictions.</p><label>EMAIL ADDRESS<input type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} /></label><PasswordField label="PASSWORD" value={password} onChange={(event) => setPassword(event.target.value)} /><p className="flow-error">{error}</p><button className="button button-primary auth-submit" disabled={busy} onClick={login}>{busy ? 'LOGGING IN…' : 'LOG IN'} <ArrowRight size={15}/></button></section></div>
}

function SignupFlow({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const notify = useToast()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '', referral: '' })
  const [proof, setProof] = useState<PaymentProof>(emptyProof())
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const [countryOpen, setCountryOpen] = useState(false)
  const [country, setCountry] = useState<PaymentCountry | null>(null)
  const [busy, setBusy] = useState(false)
  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: event.target.value })
  const copy = async (value: string, label: string) => { await navigator.clipboard?.writeText(value); setCopied(label); setTimeout(() => setCopied(''), 1600) }
  const next = async () => {
    if (!form.name || !form.email || !form.phone || !form.password || form.password !== form.confirm) return setError('Please complete every required field and make sure passwords match.')
    setBusy(true)
    setError('')
    try {
      await registerAccount({ name: form.name, email: form.email, phone: form.phone, password: form.password, referral: form.referral })
      notify({ title: 'Account created', message: 'Continue to payment so an admin can confirm your access.' })
      setCountryOpen(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create account.'
      setError(message)
      notify({ title: 'Sign up failed', message, tone: 'error' })
    } finally {
      setBusy(false)
    }
  }
  const chooseCountry = (selected: PaymentCountry) => { setCountry(selected); setCountryOpen(false); setStep(2) }
  const submitPay = async () => {
    if (!country || !proof.upload) return setError('Upload a payment screenshot.')
    setBusy(true)
    setError('')
    try {
      await submitPayment({
        kind: 'registration',
        country,
        transactionId: proof.transactionId,
        senderName: proof.senderName,
        paidFrom: proof.paidFrom,
        screenshot: proof.upload,
      })
      notify({ title: 'Payment submitted', message: 'Please wait. An admin will confirm this before you get access.', tone: 'info' })
      setStep(3)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not submit payment.'
      setError(message)
      notify({ title: 'Payment not sent', message, tone: 'error' })
    } finally {
      setBusy(false)
    }
  }
  const goToDashboard = useCallback(() => { router.push('/dashboard') }, [router])
  return <div className="modal-backdrop" role="presentation"><section className="signup-flow" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><div className="flow-top"><span>STEP {step} OF 4</span><button className="modal-close" onClick={onClose} aria-label="Close"><X size={18}/></button></div>{step === 1 && <><h2>CREATE YOUR<br/><em>ACCOUNT</em></h2><p>Sign up to access winning predictions.</p><div className="fee-card"><strong>GHS50</strong><span>≈ $3.85 USD · Registration Fee</span></div><FlowInput label="FULL NAME" value={form.name} onChange={update('name')} placeholder="Your full name"/><FlowInput label="EMAIL ADDRESS" value={form.email} onChange={update('email')} placeholder="you@example.com" type="email"/><FlowInput label="PHONE NUMBER" value={form.phone} onChange={update('phone')} placeholder="0243461892"/><PasswordField label="PASSWORD" value={form.password} onChange={update('password')} autoComplete="new-password"/><PasswordField label="CONFIRM PASSWORD" value={form.confirm} onChange={update('confirm')} autoComplete="new-password"/><FlowInput label="REFERRAL CODE (OPTIONAL)" value={form.referral} onChange={update('referral')} placeholder="e.g. IV-XXXX"/><p className="flow-error">{error}</p><button className="button button-primary auth-submit" disabled={busy} onClick={next}>{busy ? 'CREATING ACCOUNT…' : 'CONTINUE TO PAYMENT'} <ArrowRight size={15}/></button></>}{step === 2 && <><PaymentStep country={country} onCopy={copy} copied={copied} proof={proof} setProof={setProof} onBack={() => setCountryOpen(true)} onSubmit={submitPay} /><p className="flow-error">{error}</p></>}{step === 3 && <StatusStep country={country} proof={proof} onReset={() => { setProof(emptyProof()); setStep(2) }} onContinue={goToDashboard} continueLabel="WAIT FOR CONFIRMATION" notice="Please wait for an admin to confirm your payment. You will get access only after approval." />}</section>{countryOpen && <CountryModal email={form.email} onClose={() => setCountryOpen(false)} onChoose={chooseCountry} />}</div>
}

export function Ticker() { return <div className="ticker" aria-label="Recent wins"><div className="ticker-track">{[...tickerItems, ...tickerItems].map((item, i) => <span key={i}><span className="ticker-dot">●</span>{item}</span>)}</div></div> }

function Stat({ value, label }: { value: string; label: string }) { return <div className="stat"><strong>{value}</strong><span>{label}</span></div> }

export function Hero() { return <section className="hero" id="top"><div className="hero-copy"><div className="eyebrow"><span className="live-dot"/> AI MATCH INTELLIGENCE · ONLINE</div><h1>READ THE<br/><em>GAME BETTER.</em></h1><p className="hero-kicker">Vitauls Signals · Virtual Football Intelligence</p><p className="hero-text">A sharper way to approach virtual football. Upload your ticket, see the signal behind every fixture, and make your next pick with more context.</p><div className="hero-proof"><span><ShieldCheck size={15}/> Screenshot analysis</span><span><Clock3 size={15}/> Results in seconds</span></div><div className="hero-actions"><button className="button button-primary" onClick={() => window.dispatchEvent(new Event('instant-signup'))}>GET STARTED <Sparkles size={15}/></button><a className="button button-ghost" href="#reviews">See reviews <ArrowRight size={15}/></a></div><div className="stats"><Stat value="14,990+" label="WINNERS"/><Stat value="GHS 245K+" label="TOTAL WON"/><Stat value="94%" label="WIN RATE"/></div></div><TicketDisplay/></section> }

export function TicketDisplay() { return <div className="ticket-wrap"><div className="ticket-glow"/><div className="ticket-card"><div className="ticket-head"><span><span className="ticket-live"/> WINNING TICKET</span><span>JUST NOW</span></div><div className="ticket-id">#IV-839201 <span>VERIFIED</span></div><div className="ticket-games"><div className="game"><div><b>Brighton</b><small>BHA</small></div><strong>0 : 1</strong><div className="game-right"><b>Everton</b><small>EVE</small></div></div><div className="game"><div><b>Crystal Palace</b><small>CRY</small></div><strong>2 : 1</strong><div className="game-right"><b>Brentford</b><small>BRE</small></div></div></div><div className="ticket-details"><span>Odds <b>7.42</b></span><span>Stake <b>GHS 50.00</b></span><span>Return <b className="red">GHS 371.00</b></span></div><div className="ticket-win"><Check size={18}/><div><b>Wow, congratulations!</b><small>Your ticket is a winner.</small></div><button aria-label="Share ticket"><ArrowRight size={17}/></button></div></div><div className="signal-panel"><div><span className="signal-kicker">SIGNAL ENGINE</span><strong>Fixture confidence</strong></div><b>94.8%</b><div className="signal-bar"><span/></div><small>Based on form, odds & recent patterns</small></div><div className="ticket-caption"><ShieldCheck size={15}/> AI-assisted match reading</div></div> }

const steps = [{ n: '01', icon: Play, title: 'Open SportyBet', text: 'Open the Instant Football section and choose the matches you want to play.' }, { n: '02', icon: Upload, title: 'Take a screenshot', text: 'Capture your virtual football ticket before placing your bet.' }, { n: '03', icon: Sparkles, title: 'Upload for analysis', text: 'Send your screenshot to our AI and get a prediction in seconds.' }, { n: '04', icon: Check, title: 'View your results', text: 'Use the insights to make smarter picks and start winning.' }]
export function HowItWorks() { return <section className="section how" id="how"><div className="section-intro"><div className="section-label">SIMPLE BY DESIGN</div><h2>From screenshot<br/><em>to smarter picks.</em></h2><p>Four quick steps between you and a better virtuals ticket.</p></div><div className="steps">{steps.map(({ n, icon: Icon, title, text }) => <div className="step" key={n}><div className="step-top"><span>{n}</span><Icon size={18}/></div><h3>{title}</h3><p>{text}</p></div>)}</div></section> }

export function Reviews() { const [index, setIndex] = useState(0); return <section className="section reviews" id="reviews"><div className="review-head"><div><div className="section-label">THE COMMUNITY</div><h2>Real people.<br/><em>Real wins.</em></h2></div><div className="review-arrows"><button onClick={() => setIndex(Math.max(0, index - 1))} aria-label="Previous review"><ChevronLeft/></button><button onClick={() => setIndex(Math.min(testimonials.length - 1, index + 1))} aria-label="Next review"><ChevronRight/></button></div></div><div className="review-stats"><div><strong><Star size={18} fill="currentColor"/> 5.0</strong><span>AVERAGE RATING</span></div><div><strong>5,000</strong><span>ACTIVE USERS</span></div><div><strong>100%</strong><span>WOULD RECOMMEND</span></div></div><div className="review-grid">{testimonials.map((t, i) => <article className={`review-card ${i === index ? 'selected' : ''}`} key={t.name}><div className="review-person"><span className="avatar">{t.initial}</span><div><b>{t.name}</b><small>{t.place}</small></div><span className="review-stars">★★★★★</span></div><p>“{t.text}”</p><div className="won"><span>WON THIS MONTH</span><b>{t.amount}</b></div></article>)}</div></section> }

export function CTA() { return <section className="cta" id="start"><div className="section-label">YOUR NEXT WIN STARTS HERE</div><h2>Ready to play<br/><em>smarter?</em></h2><p>Join a growing community using AI to make better virtual football picks.</p><button className="button button-primary" onClick={() => window.dispatchEvent(new Event('instant-signup'))}>GET STARTED FREE <ArrowRight size={16}/></button><small>18+ &nbsp; Play responsibly. Predictions are for entertainment only.</small></section> }

export function Footer() { return <footer><a className="brand" href="#top"><span className="brand-mark"><Zap size={17} fill="currentColor" /></span><span>VITAULS<span>SIGNALS</span></span></a><div className="footer-links"><a href="#how">How it works</a><a href="#reviews">Reviews</a><a href="#faq">FAQ</a><a href="#start">Telegram support <ArrowRight size={14}/></a></div><p>© 2026 Vitauls Signals · 18+ · Play responsibly.</p></footer> }

export function ChatWidget() { const [open, setOpen] = useState(false); return <><button className="chat-button" onClick={() => setOpen(!open)} aria-label="Open support chat">{open ? <X/> : <MessageCircle/>}</button>{open && <div className="chat-box"><div className="chat-box-head"><div><b>Instant support</b><small>Usually replies instantly</small></div><span className="online"/></div><div className="chat-message">Hi there. How can we help you get started?</div><a className="chat-link" href="#start">Start a conversation <ArrowRight size={14}/></a></div>}</> }

export function FAQ() { return <section className="section faq" id="faq"><div><div className="section-label">QUESTIONS, ANSWERED</div><h2>Good to<br/><em>know.</em></h2></div><div className="faq-list"><details open><summary>What is Vitauls Signals?<ChevronDown/></summary><p>We use AI to analyze your SportyBet Instant Football screenshots and surface smarter picks.</p></details><details><summary>How does the prediction work?<ChevronDown/></summary><p>Upload a clear screenshot and our analysis highlights the strongest outcomes from your ticket.</p></details><details><summary>Is it free to get started?<ChevronDown/></summary><p>Yes. You can explore the platform and see how it works for free.</p></details></div></section> }

export default function InstantVirtuals() {
  const [chatReady, setChatReady] = useState(false)
  useEffect(() => {
    const idle = window.setTimeout(() => setChatReady(true), 1200)
    return () => window.clearTimeout(idle)
  }, [])
  return <><Header/><Ticker/><main><Hero/><HowItWorks/><Reviews/><FAQ/><CTA/></main><Footer/>{chatReady && <ChatWidget/>}</>
}
