'use client'

import { useState } from 'react'
import { ArrowRight, Check, ChevronRight, Clock3, CloudUpload, TriangleAlert, X } from 'lucide-react'
import { submitPayment, type PaymentKind } from '@/lib/api'
import { useToast } from '@/components/app-toast'

export type PaymentCountry = 'ghana' | 'nigeria' | 'other'
export type PaymentProof = { transactionId: string; senderName: string; paidFrom: string; file: string; upload: File | null }
export const emptyProof = (): PaymentProof => ({ transactionId: '', senderName: '', paidFrom: '', file: '', upload: null })

export function FlowInput({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label>{label}<input {...props}/></label>
}

export function PaymentRow({ label, value, copy, copied, highlight }: { label: string; value: string; copy?: () => void; copied?: boolean; highlight?: boolean }) {
  return <div className="payment-row"><span>{label}</span><strong className={highlight ? 'amount' : ''}>{value}</strong>{copy && <button onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>}</div>
}

export function CountryModal({ email, onClose, onChoose }: { email: string; onClose: () => void; onChoose: (country: PaymentCountry) => void }) {
  return <div className="country-backdrop" role="presentation"><section className="country-modal" role="dialog" aria-modal="true" aria-labelledby="country-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Close"><X size={18}/></button><h2 id="country-title">SELECT YOUR<br/><em>COUNTRY</em></h2><p>Vitauls Signals gateway — choose your payment region</p><div className="country-email">✉ <span>{email || 'you@example.com'}</span></div><button className="country-option ghana" onClick={() => onChoose('ghana')}><span className="country-flag">GH</span><span><b>Ghana</b><small>GHC50 — Pay via Mobile Money</small></span><ChevronRight/></button><button className="country-option nigeria" onClick={() => onChoose('nigeria')}><span className="country-flag">NG</span><span><b>Nigeria</b><small>₦10,000 — Bank Transfer</small></span><ChevronRight/></button><button className="country-option" onClick={() => onChoose('other')}><span className="country-flag">◎</span><span><b>Other Country</b><small>Pay via Telegram support</small></span><ChevronRight/></button><button className="country-cancel" onClick={onClose}>Cancel</button></section></div>
}

export function PaymentStep({ country, onCopy, copied, proof, setProof, onBack, onSubmit }: { country: PaymentCountry | null; onCopy: (value: string, label: string) => void; copied: string; proof: PaymentProof; setProof: (value: PaymentProof) => void; onBack: () => void; onSubmit: () => void }) {
  const nigeria = country === 'nigeria'
  const updateProof = (key: keyof PaymentProof) => (event: React.ChangeEvent<HTMLInputElement>) => setProof({ ...proof, [key]: event.target.value })
  const ready = Boolean(proof.senderName.trim() && proof.paidFrom.trim() && proof.upload)
  return <>
    <h2>COMPLETE<br/><em>PAYMENT</em></h2>
    <p>Send the exact amount, then submit your payment details and screenshot for approval.</p>
    <div className="payment-card">
      <div className="payment-title">↓ &nbsp; SEND TO &nbsp; ↓</div>
      {nigeria ? <>
        <PaymentRow label="BANK NAME" value="VTNetworks"/>
        <PaymentRow label="ACCOUNT NUMBER" value="1119212798" copy={() => onCopy('1119212798','number')} copied={copied === 'number'}/>
        <PaymentRow label="ACCOUNT NAME" value="DADZIE SAMUEL VTMONEY"/>
        <PaymentRow label="AMOUNT" value="₦10,000.00" copy={() => onCopy('10000','amount')} copied={copied === 'amount'} highlight/>
        <ol>
          <li>Open your bank app or dial your bank USSD code</li>
          <li>Select Transfer to another bank</li>
          <li>Choose the bank name shown above</li>
          <li>Enter the account number and confirm the account name</li>
          <li>Send the exact amount, then screenshot your receipt</li>
        </ol>
      </> : <>
        <PaymentRow label="NETWORK" value="Telecel Ghana"/>
        <PaymentRow label="MOBILE MONEY NUMBER" value="0535999462" copy={() => onCopy('0535999462','number')} copied={copied === 'number'}/>
        <PaymentRow label="ACCOUNT NAME" value="GRACE AHIABLE"/>
        <PaymentRow label="AMOUNT" value="GHC50.00" copy={() => onCopy('50','amount')} copied={copied === 'amount'} highlight/>
        <ol>
          <li>Dial *170# (MTN) / *110# (Telecel) / *718# (AT)</li>
          <li>Select Transfer / Send Money</li>
          <li>Enter the number shown above</li>
          <li>Enter the exact amount</li>
          <li>Confirm and enter PIN</li>
        </ol>
      </>}
    </div>
    <FlowInput label="TRANSACTION ID (OPTIONAL)" value={proof.transactionId} onChange={updateProof('transactionId')} placeholder="e.g. 000012345678"/>
    <FlowInput label="SENDER NAME (AS ON MOMO / BANK) *" value={proof.senderName} onChange={updateProof('senderName')} placeholder="e.g. Abel Afriyie"/>
    <FlowInput label={nigeria ? 'YOUR ACCOUNT NUMBER YOU PAID FROM *' : 'YOUR MOMO NUMBER YOU PAID FROM *'} value={proof.paidFrom} onChange={updateProof('paidFrom')} placeholder={nigeria ? 'e.g. 0123456789' : 'e.g. 0241234567'} inputMode="numeric"/>
    <label className={proof.file ? 'upload-box has-file' : 'upload-box'}>
      <CloudUpload size={28}/>
      <strong>{proof.file || 'Tap to upload screenshot'}</strong>
      <small>{proof.file ? 'PNG, JPG, WEBP · Tap to replace' : 'PNG, JPG, WEBP'}</small>
      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
        const upload = event.target.files?.[0] || null
        setProof({ ...proof, file: upload?.name || '', upload })
      }}/>
    </label>
    <div className="payment-warning" role="note">
      <b><TriangleAlert size={16}/> WARNING</b>
      <p>Uploading a fake or manipulated payment screenshot will result in an <em>immediate and permanent ban</em>. You will lose access and will not be able to register again. All screenshots are verified manually.</p>
    </div>
    <div className="payment-actions">
      <button type="button" className="button button-ghost payment-back" onClick={onBack}>Back</button>
      <button className="button button-primary auth-submit" disabled={!ready} onClick={onSubmit}>SUBMIT PAYMENT PROOF <ArrowRight size={15}/></button>
    </div>
  </>
}

export function StatusStep({ country, proof, onReset, onContinue, continueLabel = 'I UNDERSTAND', notice = 'Please wait for an admin to confirm your payment before you get access.' }: { country: PaymentCountry | null; proof: PaymentProof; onReset: () => void; onContinue: () => void; continueLabel?: string; notice?: string }) {
  const nigeria = country === 'nigeria'
  return <>
    <div className="success-notice wait-notice"><Clock3 size={18}/> Payment received — waiting for admin<br/><small>{notice}</small></div>
    <h2>PAYMENT<br/><em>STATUS</em></h2>
    <p>An admin must confirm this payment in the backend before access is granted. This is not automatic.</p>
    <div className="under-review"><Clock3 size={28}/><h3>WAITING FOR ADMIN</h3><span>Please wait for admin confirmation. You will get access after your payment is approved.</span></div>
    <div className="progress-card"><b>◷ &nbsp; PROGRESS</b><p className="done"><Check size={16}/> Payment proof received</p><p><Clock3 size={16}/> Waiting for admin confirmation</p><p><Check size={16}/> Access granted after approval</p></div>
    <div className="payment-card details">
      <div className="payment-title">▣ &nbsp; {nigeria ? 'BANK TRANSFER DETAILS' : 'MOBILE MONEY DETAILS'}</div>
      <PaymentRow label="AMOUNT" value={nigeria ? '₦10,000.00' : 'GHC50.00'}/>
      <PaymentRow label="SENDER NAME" value={proof.senderName || 'Your name'}/>
      <PaymentRow label="PAID FROM" value={proof.paidFrom || 'Your number'}/>
      <PaymentRow label="TRANSACTION ID" value={proof.transactionId || '—'}/>
      <PaymentRow label="SCREENSHOT" value={proof.file || 'Uploaded proof'}/>
    </div>
    <button className="button button-primary auth-submit" onClick={onContinue}>{continueLabel} <ArrowRight size={15}/></button>
    <button className="different-payment" onClick={onReset}>Submit a different payment</button>
  </>
}

export function PredictionPaymentModal({ email, kind, onClose, onSubmitted }: { email: string; kind: PaymentKind; onClose: () => void; onSubmitted: () => void }) {
  const notify = useToast()
  const [step, setStep] = useState(2)
  const [proof, setProof] = useState<PaymentProof>(emptyProof())
  const [copied, setCopied] = useState('')
  const [countryOpen, setCountryOpen] = useState(true)
  const [country, setCountry] = useState<PaymentCountry | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const copy = async (value: string, label: string) => { await navigator.clipboard?.writeText(value); setCopied(label); setTimeout(() => setCopied(''), 1600) }
  const chooseCountry = (selected: PaymentCountry) => { setCountry(selected); setCountryOpen(false); setStep(2) }
  const closeCountry = () => { if (!country) onClose(); else setCountryOpen(false) }
  const submit = async () => {
    if (!country || !proof.upload) return
    setBusy(true)
    setError('')
    try {
      await submitPayment({
        kind,
        country,
        transactionId: proof.transactionId,
        senderName: proof.senderName,
        paidFrom: proof.paidFrom,
        screenshot: proof.upload,
      })
      setStep(3)
      notify({ title: 'Payment submitted', message: 'Please wait. An admin will confirm this before access or diamonds are granted.', tone: 'info' })
    } catch (err) {
      notify({ title: 'Payment not sent', message: err instanceof Error ? err.message : 'Could not submit payment.', tone: 'error' })
      setError(err instanceof Error ? err.message : 'Could not submit payment.')
    } finally {
      setBusy(false)
    }
  }

  return <>
    {!countryOpen && <div className="modal-backdrop" role="presentation"><section className="signup-flow" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
      <div className="flow-top"><span>STEP {step} OF 4</span><button className="modal-close" onClick={onClose} aria-label="Close"><X size={18}/></button></div>
      {step === 2 && <>
        <PaymentStep country={country} onCopy={copy} copied={copied} proof={proof} setProof={setProof} onBack={() => setCountryOpen(true)} onSubmit={submit} />
        {error && <p className="flow-error">{error}</p>}
        {busy && <p className="flow-error" style={{ color: 'var(--muted)' }}>Submitting payment proof…</p>}
      </>}
      {step === 3 && <StatusStep country={country} proof={proof} onReset={() => { setProof(emptyProof()); setStep(2) }} onContinue={onSubmitted} continueLabel="I UNDERSTAND" notice="Please wait for an admin to confirm this payment. Access is granted only after approval." />}
    </section></div>}
    {countryOpen && <CountryModal email={email} onClose={closeCountry} onChoose={chooseCountry} />}
  </>
}
