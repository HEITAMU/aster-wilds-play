/**
 * 窃冠者 — deterministic, frame-independent game rules.
 * No Cocos dependency: used unchanged in WeChat and the node test suite.
 */
export const ROUND_SECONDS = 58;
export const PLAYER_Z = 4.4;
export const LANES = [-3.1, 0, 3.1] as const;
export type RivalKind = 'duel' | 'thorn' | 'relic' | 'noble';
export interface Wave { index: number; at: number; lane: 0 | 1 | 2; kind: RivalKind; speed: number; worth: number; }
export interface Summary { banked: number; loose: number; combo: number; perfect: number; hits: number; parries: number; highestCombo: number; best: number; }

export function xorshift32(n: number): () => number {
  let state = (n >>> 0) || 0x19283655;
  return () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function dateBeijing(epoch = Date.now()): string {
  return new Date(epoch + 8 * 3600000).toISOString().slice(0, 10);
}
export function dailySeed(date = dateBeijing()): number { return hashSeed('CROWN_DAILY_' + date); }
export function dailyKey(date = dateBeijing()): string { return 'ct_daily_' + date.replace(/-/g, ''); }
export function bestTitle(score: number): string {
  if (score >= 22000) return '不朽冕主';
  if (score >= 15000) return '夜宴君王';
  if (score >= 9000) return '白银公爵';
  if (score >= 4200) return '镀金骑士';
  return '无名挑战者';
}

/** Waves only depend on seed and index. No paid effect can modify them. */
export function generateWaves(seed: number): Wave[] {
  const rand = xorshift32(seed);
  const waves: Wave[] = [];
  let at = 0.8;
  let previousLane = 1;
  let streakOnLane = 0;
  let i = 0;
  while (at < ROUND_SECONDS - 1.9) {
    const progress = at / ROUND_SECONDS;
    const r = rand();
    let lane = Math.floor(rand() * 3) as 0 | 1 | 2;
    if (lane === previousLane) streakOnLane++;
    else streakOnLane = 0;
    if (streakOnLane > 3) { lane = ((lane + 1 + Math.floor(rand() * 2)) % 3) as 0 | 1 | 2; streakOnLane = 0; }
    previousLane = lane;
    // Readable shape language: red thorn enemies are never necessary to defeat.
    const kind: RivalKind = r < 0.15 + 0.08 * progress ? 'thorn'
      : r < 0.32 + 0.08 * progress ? 'relic'
      : r > 0.85 && progress > 0.26 ? 'noble' : 'duel';
    waves.push({index:i++, at: +at.toFixed(3), lane, kind, speed: 8.2 + 2.5 * progress, worth: kind === 'noble' ? 370 : kind === 'relic' ? 180 : 240});
    at += 1.08 - 0.20 * progress + rand() * 0.26;
  }
  return waves;
}
export class CrownRules {
  readonly waves: Wave[];
  time = 0;
  banked = 0;
  loose = 0;
  combo = 0;
  perfect = 0;
  hits = 0;
  parries = 0;
  highestCombo = 0;
  bankCooldown = 0;
  invincible = 0;
  finished = false;
  readonly seed: number;
  constructor(seed: number) { this.seed = seed; this.waves = generateWaves(seed); }
  get total(): number { return this.banked + this.loose; }
  get multiplier(): number { return 1 + Math.min(2.5, Math.floor(this.combo / 4) * 0.25); }
  tick(dt: number): void {
    if (this.finished) return;
    this.time = Math.min(ROUND_SECONDS, this.time + Math.max(0, dt));
    this.bankCooldown = Math.max(0, this.bankCooldown - Math.max(0, dt));
    this.invincible = Math.max(0, this.invincible - Math.max(0, dt));
    if (this.time >= ROUND_SECONDS) this.finish();
  }
  successfulParry(w: Wave, perfect: boolean): number {
    if (this.finished || w.kind === 'thorn' || w.kind === 'relic') return 0;
    this.parries++;
    this.combo++;
    this.highestCombo = Math.max(this.highestCombo, this.combo);
    if (perfect) this.perfect++;
    const earned = Math.round((w.worth + (perfect ? 130 : 0)) * this.multiplier);
    this.loose += earned;
    return earned;
  }
  pickup(): number {
    this.loose += 160 + Math.min(180, this.combo * 12);
    return this.loose;
  }
  miss(): void { this.combo = 0; }
  hit(): number {
    if (this.invincible > 0 || this.finished) return 0;
    this.hits++;
    const lost = Math.ceil(this.loose * 0.62);
    this.loose -= lost;
    this.combo = 0;
    this.invincible = 1.1;
    return lost;
  }
  bank(): number {
    if (this.finished || this.bankCooldown > 0 || this.loose < 1) return 0;
    const earned = this.loose;
    this.banked += earned;
    this.loose = 0;
    this.combo = 0;
    this.bankCooldown = 3.4;
    return earned;
  }
  finish(): void {
    if (this.finished) return;
    this.banked += Math.floor(this.loose * 0.7); // penalties for greed / too-late banking
    this.loose = 0;
    this.finished = true;
  }
  getSummary(previousBest = 0): Summary {
    return { banked:this.banked, loose:this.loose, combo:this.combo, perfect:this.perfect,
      hits:this.hits, parries:this.parries, highestCombo:this.highestCombo,
      best: Math.max(previousBest, this.banked) };
  }
}
export interface Challenge { seed: number; target: number; date: string; }
export function parseChallenge(query: Record<string, any> | undefined): Challenge | null {
  if (!query || query.mode !== 'challenge') return null;
  const seed = Number(query.seed), target = Number(query.target);
  const date = String(query.date || '').slice(0,10);
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 4294967295 ||
      !Number.isSafeInteger(target) || target < 0 || target > 999999999 ||
      !/^\d{4}-\d\d-\d\d$/.test(date)) return null;
  return {seed, target, date};
}
