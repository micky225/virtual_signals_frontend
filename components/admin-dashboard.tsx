'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Clock3, Search, Shield, Users, X } from 'lucide-react'
import {
  fetchAdminPayments,
  fetchAdminScreenshot,
  fetchAdminUsers,
  fetchMe,
  readUser,
  reviewAdminPayment,
  type AdminCounts,
  type AdminPayment,
  type AdminPaymentStatus,
  type AdminUserRow,
  type PaymentKind,
} from '@/lib/api'
import { useToast } from '@/components/app-toast'

const kindLabel: Record<PaymentKind, string> = {
  registration: 'Registration',
  football: 'Instant Football',
  bottle: 'Spin the Bottle',
  diamonds: 'Diamond top-up',
}

const countryLabel: Record<string, string> = {
  ghana: 'Ghana',
  nigeria: 'Nigeria',
  other: 'Other',
}

export default function AdminDashboard() {
  const router = useRouter()
  const notify = useToast()
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState<'payments' | 'users'>('payments')
  const [status, setStatus] = useState<AdminPaymentStatus>('pending')
  const [query, setQuery] = useState('')
  const [counts, setCounts] = useState<AdminCounts>({ pending: 0, approved: 0, rejected: 0, users: 0 })
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [busyId, setBusyId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState<number | null>(null)

  const loadPayments = useCallback(async (nextStatus: AdminPaymentStatus, nextQuery: string) => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchAdminPayments(nextStatus, nextQuery)
      setCounts(data.counts)
      setPayments(data.payments)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load payments.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadUsers = useCallback(async (nextQuery: string) => {
    setLoading(true)
    setError('')
    try {
      setUsers(await fetchAdminUsers(nextQuery))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load users.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const start = async () => {
      try {
        const me = await fetchMe()
        if (!me.isAdmin) {
          router.replace('/dashboard')
          return
        }
        setReady(true)
      } catch {
        router.replace('/')
      }
    }
    if (!readUser()?.isAdmin && !readUser()) {
      start()
      return
    }
    start()
  }, [router])

  useEffect(() => {
    if (!ready) return
    if (tab === 'payments') loadPayments(status, query)
    else loadUsers(query)
  }, [ready, tab, status, loadPayments, loadUsers])

  const review = async (id: number, action: 'approve' | 'reject') => {
    setBusyId(id)
    try {
      await reviewAdminPayment(id, action)
      notify({
        title: action === 'approve' ? 'Payment approved' : 'Payment rejected',
        message: action === 'approve' ? 'The user now has access for this payment.' : 'The user was not granted access.',
        tone: action === 'approve' ? 'success' : 'info',
      })
      await loadPayments(status, query)
    } catch (err) {
      notify({
        title: 'Could not update payment',
        message: err instanceof Error ? err.message : 'Try again.',
        tone: 'error',
      })
    } finally {
      setBusyId(null)
    }
  }

  const pending = counts.pending

  if (!ready) return <div className="admin-page" />

  return (
    <div className="admin-page">
      <header className="admin-head">
        <button type="button" className="pkg-back" onClick={() => router.push('/dashboard')} aria-label="Back to dashboard">
          <ArrowLeft size={18} />
        </button>
        <div>
          <strong>Admin dashboard</strong>
          <em>Review payments and grant access</em>
        </div>
        <span className="admin-badge"><Shield size={14} /> STAFF</span>
      </header>

      <section className="admin-stats">
        <div><b>{counts.pending}</b><span>PENDING</span></div>
        <div><b>{counts.approved}</b><span>APPROVED</span></div>
        <div><b>{counts.rejected}</b><span>REJECTED</span></div>
        <div><b>{counts.users}</b><span>USERS</span></div>
      </section>

      <div className="admin-tabs">
        <button type="button" className={tab === 'payments' ? 'on' : ''} onClick={() => setTab('payments')}>Payments</button>
        <button type="button" className={tab === 'users' ? 'on' : ''} onClick={() => setTab('users')}><Users size={14} /> Users</button>
      </div>

      <div className="admin-search">
        <Search size={15} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') tab === 'payments' ? loadPayments(status, query) : loadUsers(query)
          }}
          placeholder={tab === 'payments' ? 'Search email, name, or transaction ID' : 'Search users'}
        />
        <button type="button" onClick={() => tab === 'payments' ? loadPayments(status, query) : loadUsers(query)}>Search</button>
      </div>

      {tab === 'payments' && (
        <div className="admin-filters">
          {(['pending', 'all', 'approved', 'rejected'] as AdminPaymentStatus[]).map((item) => (
            <button type="button" key={item} className={status === item ? 'on' : ''} onClick={() => setStatus(item)}>
              {item === 'pending' ? `Pending (${pending})` : item}
            </button>
          ))}
        </div>
      )}

      {error && <p className="pkg-error">{error}</p>}
      {loading && <p className="admin-empty"><Clock3 size={16} /> Loading…</p>}

      {tab === 'payments' && !loading && payments.length === 0 && (
        <p className="admin-empty">No {status === 'all' ? '' : status} payments found.</p>
      )}

      {tab === 'payments' && payments.map((payment) => (
        <PaymentCard
          key={payment.id}
          payment={payment}
          open={openId === payment.id}
          busy={busyId === payment.id}
          onToggle={() => setOpenId((current) => current === payment.id ? null : payment.id)}
          onApprove={() => review(payment.id, 'approve')}
          onReject={() => review(payment.id, 'reject')}
        />
      ))}

      {tab === 'users' && !loading && users.length === 0 && <p className="admin-empty">No users found.</p>}
      {tab === 'users' && users.map((user) => (
        <article className="admin-user" key={user.id}>
          <div>
            <b>{user.name || user.email}</b>
            <small>{user.email}</small>
            <small>{user.phone || 'No phone'}</small>
          </div>
          <ul>
            <li>{user.registrationApproved ? 'Registered' : 'Awaiting registration'}</li>
            <li>{user.footballUnlocked ? 'Football on' : 'Football locked'}</li>
            <li>{user.bottleUnlocked ? 'Bottle on' : 'Bottle locked'}</li>
            <li>{user.diamonds} diamonds</li>
            {user.pendingPayments > 0 && <li className="warn">{user.pendingPayments} pending</li>}
          </ul>
        </article>
      ))}
    </div>
  )
}

function PaymentCard({
  payment,
  open,
  busy,
  onToggle,
  onApprove,
  onReject,
}: {
  payment: AdminPayment
  open: boolean
  busy: boolean
  onToggle: () => void
  onApprove: () => void
  onReject: () => void
}) {
  const pending = payment.status === 'pending'
  return (
    <article className={`admin-card ${payment.status}`}>
      <button type="button" className="admin-card-top" onClick={onToggle}>
        <div>
          <b>{payment.userName || payment.userEmail}</b>
          <small>{payment.userEmail}</small>
        </div>
        <em className={`admin-status ${payment.status}`}>{payment.status}</em>
      </button>
      <p className="admin-kind">{kindLabel[payment.kind] || payment.kind} · {countryLabel[payment.country] || payment.country} · {payment.amount}</p>
      <dl className="admin-meta">
        <div><dt>Phone</dt><dd>{payment.userPhone || '—'}</dd></div>
        <div><dt>Sender</dt><dd>{payment.sender_name || '—'}</dd></div>
        <div><dt>Paid from</dt><dd>{payment.paid_from || '—'}</dd></div>
        <div><dt>Txn ID</dt><dd>{payment.transaction_id || '—'}</dd></div>
        <div><dt>Submitted</dt><dd>{new Date(payment.created_at).toLocaleString()}</dd></div>
      </dl>
      {open && <ProofImage paymentId={payment.id} />}
      {!open && (
        <button type="button" className="admin-view-proof" onClick={onToggle}>View payment screenshot</button>
      )}
      {pending && (
        <div className="admin-actions">
          <button type="button" className="admin-approve" disabled={busy} onClick={onApprove}>
            <Check size={15} /> {busy ? 'Saving…' : 'Approve'}
          </button>
          <button type="button" className="admin-reject" disabled={busy} onClick={onReject}>
            <X size={15} /> Reject
          </button>
        </div>
      )}
    </article>
  )
}

function ProofImage({ paymentId }: { paymentId: number }) {
  const [src, setSrc] = useState('')
  const [failed, setFailed] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchAdminScreenshot(paymentId)
      .then((url) => {
        if (!cancelled) setSrc(url)
      })
      .catch((err) => {
        if (!cancelled) setFailed(err instanceof Error ? err.message : 'Screenshot could not be loaded.')
      })
    return () => { cancelled = true }
  }, [paymentId])

  if (failed) return <p className="admin-empty">{failed}</p>
  if (!src) return <p className="admin-empty">Loading screenshot…</p>
  return <a className="admin-proof" href={src} target="_blank" rel="noreferrer"><img src={src} alt="Payment screenshot" /></a>
}
