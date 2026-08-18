export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
export const TOKEN_KEY = 'vitauls-token'
export const USER_KEY = 'instant-virtuals-user'

export type GameKey = 'football' | 'bottle'
export type PaymentKind = 'registration' | 'football' | 'bottle' | 'diamonds'

export type SessionUser = {
  name: string
  email: string
  phone?: string
  registrationApproved?: boolean
  diamonds?: number
  unlocked?: Record<GameKey, boolean>
  pendingPayments?: { id: number; kind: string; status: string }[]
  isAdmin?: boolean
}

export type MatchPick = { home: string; away: string; pick: string; confidence: number }
export type SignalPick = { round: string; pick: 'UP' | 'DOWN'; confidence: number }
export type HistoryItem = {
  id: string
  game: GameKey
  at: number
  cost: number
  football?: MatchPick[]
  bottle?: SignalPick[]
}

function token() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

let meInFlight: Promise<SessionUser> | null = null
let meCache: { at: number; user: SessionUser } | null = null
let meGeneration = 0
const ME_TTL_MS = 5000

export function invalidateMe() {
  meCache = null
  meInFlight = null
  meGeneration += 1
}

export function saveSession(nextToken: string, user: SessionUser) {
  localStorage.setItem(TOKEN_KEY, nextToken)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  meCache = { at: Date.now(), user }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  invalidateMe()
}

export function readUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SessionUser
    if (!parsed?.name && !parsed?.email) return null
    return parsed
  } catch {
    return null
  }
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || 'there'
}

export function initials(name: string, email = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  if (parts.length === 1 && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase()
  const local = email.split('@')[0] || 'IV'
  return local.slice(0, 2).toUpperCase()
}

async function parse(response: Response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = (data as { error?: string; detail?: string }).error
      || (data as { detail?: string }).detail
      || (typeof (data as { message?: string }).message === 'string' ? (data as { message: string }).message : '')
      || Object.values((data as Record<string, unknown>) || {}).flat().toString()
      || `Request failed (${response.status}).`
    throw new Error(typeof error === 'string' ? error : 'Request failed.')
  }
  return data
}

export async function api(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers)
  const auth = token()
  if (auth) headers.set('Authorization', `Token ${auth}`)
  if (!(options.body instanceof FormData) && !headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }
  return parse(await fetch(`${API_URL}${path}`, { ...options, headers }))
}

export async function registerAccount(input: { name: string; email: string; phone: string; password: string; referral?: string }) {
  const data = await api('/api/auth/register/', { method: 'POST', body: JSON.stringify(input) }) as { token: string; user: SessionUser }
  saveSession(data.token, data.user)
  return data.user
}

export async function loginAccount(email: string, password: string) {
  const data = await api('/api/auth/login/', { method: 'POST', body: JSON.stringify({ email, password }) }) as { token: string; user: SessionUser }
  saveSession(data.token, data.user)
  return data.user
}

export async function fetchMe(force = false) {
  if (!force && meCache && Date.now() - meCache.at < ME_TTL_MS) return meCache.user
  if (meInFlight) return meInFlight
  const generation = meGeneration
  const request = (async () => {
    const user = await api('/api/auth/me/') as SessionUser
    if (generation !== meGeneration) return user
    const current = readUser()
    localStorage.setItem(USER_KEY, JSON.stringify({ ...current, ...user }))
    meCache = { at: Date.now(), user }
    return user
  })()
  meInFlight = request
  try {
    return await request
  } finally {
    if (meInFlight === request) meInFlight = null
  }
}

export async function submitPayment(input: {
  kind: PaymentKind
  country: string
  transactionId: string
  senderName: string
  paidFrom: string
  screenshot: File
}) {
  const body = new FormData()
  body.append('kind', input.kind)
  body.append('country', input.country)
  body.append('transaction_id', input.transactionId)
  body.append('sender_name', input.senderName)
  body.append('paid_from', input.paidFrom)
  body.append('screenshot', input.screenshot)
  invalidateMe()
  return api('/api/payments/', { method: 'POST', body })
}

export async function runPrediction(game: GameKey, image: File) {
  const body = new FormData()
  body.append('game', game)
  body.append('image', image)
  invalidateMe()
  return api('/api/predictions/', { method: 'POST', body }) as Promise<{
    game: GameKey
    predictions: MatchPick[] | SignalPick[]
    diamonds: number
    id: number
    created_at: string
  }>
}

export async function fetchPredictions(game: GameKey) {
  const rows = await api(`/api/predictions/?game=${game}&limit=20`) as { id: number; game: GameKey; cost: number; payload: MatchPick[] | SignalPick[]; created_at: string }[]
  return rows.map((row) => ({
    id: String(row.id),
    game: row.game,
    at: new Date(row.created_at).getTime(),
    cost: row.cost,
    football: row.game === 'football' ? row.payload as MatchPick[] : undefined,
    bottle: row.game === 'bottle' ? row.payload as SignalPick[] : undefined,
  })) as HistoryItem[]
}

export async function clearPredictions(game: GameKey) {
  return api(`/api/predictions/${game}/`, { method: 'DELETE' })
}

export type AdminPaymentStatus = 'pending' | 'approved' | 'rejected' | 'all'

export type AdminPayment = {
  id: number
  kind: PaymentKind
  country: string
  amount: string
  transaction_id: string
  sender_name: string
  paid_from: string
  status: 'pending' | 'approved' | 'rejected'
  admin_note: string
  created_at: string
  userName: string
  userEmail: string
  userPhone: string
  diamonds: number
  registrationApproved: boolean
  footballUnlocked: boolean
  bottleUnlocked: boolean
}

export type AdminCounts = {
  pending: number
  approved: number
  rejected: number
  users: number
}

export type AdminUserRow = {
  id: number
  name: string
  email: string
  phone: string
  diamonds: number
  registrationApproved: boolean
  footballUnlocked: boolean
  bottleUnlocked: boolean
  pendingPayments: number
  joined: string
}

export async function fetchAdminPayments(status: AdminPaymentStatus = 'pending', query = '') {
  const params = new URLSearchParams()
  params.set('status', status)
  if (query.trim()) params.set('q', query.trim())
  return api(`/api/admin/payments/?${params}`) as Promise<{
    counts: AdminCounts
    payments: AdminPayment[]
  }>
}

export async function reviewAdminPayment(id: number, action: 'approve' | 'reject', note = '') {
  return api(`/api/admin/payments/${id}/`, {
    method: 'POST',
    body: JSON.stringify({ action, note }),
  }) as Promise<AdminPayment>
}

export async function fetchAdminUsers(query = '') {
  const suffix = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''
  return api(`/api/admin/users/${suffix}`) as Promise<AdminUserRow[]>
}

export async function fetchAdminScreenshot(id: number) {
  const data = await api(`/api/admin/payments/${id}/screenshot/`) as { mime?: string; image?: string }
  if (!data?.image) throw new Error('Screenshot is missing.')
  return `data:${data.mime || 'image/jpeg'};base64,${data.image}`
}
