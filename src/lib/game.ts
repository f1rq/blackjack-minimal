export type Suit = '♥' | '♦' | '♠' | '♣';
export type CardValue = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  value: CardValue;
  hidden?: boolean;
}

export type GameState = 
  | 'betting' 
  | 'playing' 
  | 'dealerTurn' 
  | 'playerBust' 
  | 'dealerBust' 
  | 'playerWin' 
  | 'dealerWin' 
  | 'push' 
  | 'blackjack'
  | 'got21'
  | 'gameOver';

export interface ChipOption {
  value: number;
  label: string;
}

export const SUITS: Suit[] = ['♥', '♦', '♠', '♣'];
export const VALUES: CardValue[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const ALL_CHIPS: ChipOption[] = [
  { value: 1, label: '$1' },
  { value: 5, label: '$5' },
  { value: 25, label: '$25' },
  { value: 50, label: '$50' },
  { value: 100, label: '$100' },
  { value: 500, label: '$500' },
  { value: 1000, label: '$1k' },
  { value: 5000, label: '$5k' },
  { value: 25000, label: '$25k' },
  { value: 100000, label: '$100k' }
];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (let d = 0; d < 4; d++) {
    for (const suit of SUITS) {
      for (const value of VALUES) {
        deck.push({ suit, value });
      }
    }
  }
  
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

export function calculateHandScore(hand: Card[]): number {
  let score = 0;
  let aces = 0;

  for (const card of hand) {
    if (card.hidden) continue;

    if (card.value === 'A') {
      aces += 1;
      score += 11;
    } else if (['K', 'Q', 'J'].includes(card.value)) {
      score += 10;
    } else {
      score += parseInt(card.value, 10);
    }
  }

  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }

  return score;
}

export function isRedSuit(suit: Suit | string): boolean {
  return suit === '♥' || suit === '♦';
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    maximumFractionDigits: 0 
  }).format(amount);
}

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const STORAGE_KEYS = {
  BANKROLL: 'bj_bankroll',
  RUN_PEAK: 'bj_run_peak',
  ALL_TIME_PEAK: 'bj_all_time_peak'
};

export interface SavedGameState {
  bankroll: number;
  runPeak: number;
  allTimePeak: number;
}

export function loadSavedState(): SavedGameState {
  if (typeof localStorage === 'undefined') {
    return { bankroll: 1000, runPeak: 1000, allTimePeak: 1000 };
  }

  const parseValue = (key: string, fallback: number) => {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const bankroll = parseValue(STORAGE_KEYS.BANKROLL, 1000);
  const runPeak = parseValue(STORAGE_KEYS.RUN_PEAK, Math.max(1000, bankroll));
  const allTimePeak = parseValue(STORAGE_KEYS.ALL_TIME_PEAK, Math.max(1000, runPeak));

  return { bankroll, runPeak, allTimePeak };
}

export function saveGameProgress(bankroll: number, runPeak: number, allTimePeak: number): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.BANKROLL, String(bankroll));
  localStorage.setItem(STORAGE_KEYS.RUN_PEAK, String(runPeak));
  localStorage.setItem(STORAGE_KEYS.ALL_TIME_PEAK, String(allTimePeak));
}