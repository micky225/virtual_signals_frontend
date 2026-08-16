export { readUser, firstName, initials, type SessionUser } from '@/lib/api'

export function saveUser(user: { name: string; email: string }) {
  const current = localStorage.getItem('instant-virtuals-user')
  const parsed = current ? JSON.parse(current) : {}
  localStorage.setItem('instant-virtuals-user', JSON.stringify({ ...parsed, ...user }))
}
