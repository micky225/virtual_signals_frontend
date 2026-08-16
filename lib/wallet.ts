export const WALLET_KEY = 'vitauls-wallet'
export const PREDICTION_COST = 50
export const PACKAGE_DIAMONDS = 200

export type GameKey = 'football' | 'bottle'

export type MatchPick = {
  home: string
  away: string
  pick: string
  confidence: number
}

export type SignalPick = {
  round: string
  pick: 'UP' | 'DOWN'
  confidence: number
}

export type HistoryItem = {
  id: string
  game: GameKey
  at: number
  cost: number
  football?: MatchPick[]
  bottle?: SignalPick[]
}

export type Wallet = {
  diamonds: number
  unlocked: Record<GameKey, boolean>
  history: HistoryItem[]
}

const emptyWallet = (): Wallet => ({
  diamonds: 0,
  unlocked: { football: false, bottle: false },
  history: [],
})

export function readWallet(): Wallet {
  try {
    const raw = localStorage.getItem(WALLET_KEY)
    if (!raw) return emptyWallet()
    const parsed = JSON.parse(raw) as Wallet
    return {
      diamonds: Number(parsed.diamonds) || 0,
      unlocked: {
        football: Boolean(parsed.unlocked?.football),
        bottle: Boolean(parsed.unlocked?.bottle),
      },
      history: Array.isArray(parsed.history) ? parsed.history : [],
    }
  } catch {
    return emptyWallet()
  }
}

function writeWallet(wallet: Wallet) {
  localStorage.setItem(WALLET_KEY, JSON.stringify(wallet))
}

export function isUnlocked(game: GameKey) {
  return readWallet().unlocked[game]
}

export function creditPackage(game: GameKey) {
  const wallet = readWallet()
  wallet.unlocked[game] = true
  wallet.diamonds += PACKAGE_DIAMONDS
  writeWallet(wallet)
  return wallet
}

export function spendDiamonds(amount = PREDICTION_COST) {
  const wallet = readWallet()
  if (wallet.diamonds < amount) return null
  wallet.diamonds -= amount
  writeWallet(wallet)
  return wallet
}

export function addHistory(item: HistoryItem) {
  const wallet = readWallet()
  wallet.history = [item, ...wallet.history].slice(0, 40)
  writeWallet(wallet)
  return wallet
}

export function clearHistory(game: GameKey) {
  const wallet = readWallet()
  wallet.history = wallet.history.filter((item) => item.game !== game)
  writeWallet(wallet)
  return wallet
}

export function gameHistory(game: GameKey, wallet = readWallet()) {
  return wallet.history.filter((item) => item.game === game)
}
