import type { SaveData } from '@game-types/game';
import { STORAGE_KEYS } from '@config/constants';
import { ALL_MISSIONS } from '@config/missions';

/**
 * 저장소 어댑터 인터페이스 — 추후 Capacitor Preferences로 교체 가능
 */
interface StorageAdapter {
  save(key: string, value: string): void;
  load(key: string): string | null;
}

class LocalStorageAdapter implements StorageAdapter {
  save(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      console.warn('[Save] localStorage 쓰기 실패:', key);
    }
  }

  load(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      console.warn('[Save] localStorage 읽기 실패:', key);
      return null;
    }
  }
}

const DEFAULT_SAVE: SaveData = {
  bestScore: 0,
  bestLandings: 0,
  totalJumps: 0,
  gamesPlayed: 0,
  soundEnabled: true,
  vibrationEnabled: true,
  coins: 0,
  diamonds: 0,
  ownedSkins: ['dog_default'],
  equippedSkin: 'dog_default',
  lastRouletteDate: '',
  roulettePaidSpinsToday: 0,
  shieldItems: 0,
  magnetItems: 0,
  revivalItems: 0,
  claimedMissions: [],
};

export class SaveManager {
  private adapter: StorageAdapter;
  private data: SaveData;

  constructor(adapter: StorageAdapter = new LocalStorageAdapter()) {
    this.adapter = adapter;
    this.data = this.loadData();
  }

  getBestScore(): number    { return this.data.bestScore; }
  getBestLandings(): number { return this.data.bestLandings; }
  isSoundEnabled(): boolean { return this.data.soundEnabled; }
  isVibrationEnabled(): boolean { return this.data.vibrationEnabled; }

  getCoins(): number { return this.data.coins; }
  getDiamonds(): number { return this.data.diamonds; }
  getOwnedSkins(): string[] { return [...this.data.ownedSkins]; }
  getEquippedSkin(): string { return this.data.equippedSkin; }

  addCoins(amount: number): void {
    this.data.coins = Math.max(0, this.data.coins + amount);
    this.persist();
  }

  spendCoins(amount: number): boolean {
    if (this.data.coins < amount) return false;
    this.data.coins -= amount;
    this.persist();
    return true;
  }

  addDiamonds(amount: number): void {
    this.data.diamonds = Math.max(0, this.data.diamonds + amount);
    this.persist();
  }

  spendDiamonds(amount: number): boolean {
    if (this.data.diamonds < amount) return false;
    this.data.diamonds -= amount;
    this.persist();
    return true;
  }

  // ─── 룰렛 ────────────────────────────────────────────────

  private todayString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** 오늘 무료 스핀이 남아있으면 true */
  canFreeRoulette(): boolean {
    return this.data.lastRouletteDate !== this.todayString();
  }

  /** 무료 스핀 사용 기록 */
  recordFreeRoulette(): void {
    const today = this.todayString();
    this.data.lastRouletteDate = today;
    // 날짜가 바뀌면 유료 횟수도 리셋
    this.data.roulettePaidSpinsToday = 0;
    this.persist();
  }

  /** 오늘 사용한 유료 스핀 횟수 (0~3) */
  getPaidRouletteSpinsToday(): number {
    const today = this.todayString();
    if (this.data.lastRouletteDate !== today) return 0;
    return this.data.roulettePaidSpinsToday;
  }

  /** [테스트용] 룰렛 스핀 상태를 초기화. */
  resetRouletteState(): void {
    this.data.lastRouletteDate = '';
    this.data.roulettePaidSpinsToday = 0;
    this.persist();
  }

  /**
   * 유료 스핀 비용을 지불하고 기록. 성공 시 true.
   * 비용: 1회째=2다이아, 2회째=3다이아, 3회째=5다이아
   */
  spendPaidRoulette(): boolean {
    const costs = [2, 3, 5];
    const used = this.getPaidRouletteSpinsToday();
    if (used >= costs.length) return false;
    const cost = costs[used]!;
    if (!this.spendDiamonds(cost)) return false;
    const today = this.todayString();
    this.data.lastRouletteDate = today;
    this.data.roulettePaidSpinsToday = used + 1;
    this.persist();
    return true;
  }

  // ─────────────────────────────────────────────────────────

  // ─── 아이템 수량 ──────────────────────────────────────────────

  getShieldItems(): number  { return this.data.shieldItems ?? 0; }
  getMagnetItems(): number  { return this.data.magnetItems ?? 0; }
  getRevivalItems(): number { return this.data.revivalItems ?? 0; }

  addShieldItem(count = 1): void {
    this.data.shieldItems = (this.data.shieldItems ?? 0) + count;
    this.persist();
  }

  addMagnetItem(count = 1): void {
    this.data.magnetItems = (this.data.magnetItems ?? 0) + count;
    this.persist();
  }

  addRevivalItem(count = 1): void {
    this.data.revivalItems = (this.data.revivalItems ?? 0) + count;
    this.persist();
  }

  /** 부활 아이템 1개 소비. 잔량 부족 시 false 반환. */
  useRevivalItem(): boolean {
    if ((this.data.revivalItems ?? 0) <= 0) return false;
    this.data.revivalItems -= 1;
    this.persist();
    return true;
  }

  // ─────────────────────────────────────────────────────────────

  /** 다이아몬드 1개 = 코인 150개, 단방향 교환 */
  exchangeDiamondsToCoins(diamondAmount: number): boolean {
    if (!this.spendDiamonds(diamondAmount)) return false;
    this.addCoins(diamondAmount * 150);
    return true;
  }

  buySkin(skinId: string): void {
    if (!this.data.ownedSkins.includes(skinId)) {
      this.data.ownedSkins.push(skinId);
    }
    this.persist();
  }

  equipSkin(skinId: string): void {
    if (this.data.ownedSkins.includes(skinId)) {
      this.data.equippedSkin = skinId;
      this.persist();
    }
  }

  setSoundEnabled(enabled: boolean): void {
    this.data.soundEnabled = enabled;
    this.persist();
  }

  setVibrationEnabled(enabled: boolean): void {
    this.data.vibrationEnabled = enabled;
    this.persist();
  }

  /**
   * 게임 종료 후 점수 제출. 새 최고 기록이면 true 반환.
   */
  submitScore(score: number, jumps: number): boolean {
    const isNewBest = score > this.data.bestScore;
    if (isNewBest) this.data.bestScore = score;
    if (jumps > this.data.bestLandings) this.data.bestLandings = jumps;
    this.data.totalJumps += jumps;
    this.data.gamesPlayed += 1;
    this.persist();
    return isNewBest;
  }

  // ─── 미션 ─────────────────────────────────────────────────

  getClaimedMissions(): ReadonlySet<string> {
    return new Set(this.data.claimedMissions);
  }

  /** 미션을 수령 처리하고 코인을 지급. 이미 수령했거나 미달성이면 0 반환. */
  claimMission(id: string): number {
    if (this.data.claimedMissions.includes(id)) return 0;
    const mission = ALL_MISSIONS.find((m) => m.id === id);
    if (!mission) return 0;
    const progress = mission.type === 'score'
      ? this.data.bestScore
      : this.data.bestLandings;
    if (progress < mission.target) return 0;
    this.data.claimedMissions.push(id);
    this.addCoins(mission.coinReward);
    return mission.coinReward;
  }

  /** [테스트용] 수령 완료 미션을 모두 초기화해 다시 수령 가능 상태로 되돌린다. */
  resetClaimedMissions(): void {
    this.data.claimedMissions = [];
    this.persist();
  }

  /** 수령 가능한(달성됐지만 미수령인) 미션이 하나라도 있으면 true */
  hasPendingMissions(): boolean {
    const claimed = new Set(this.data.claimedMissions);
    return ALL_MISSIONS.some((m) => {
      if (claimed.has(m.id)) return false;
      const progress = m.type === 'score' ? this.data.bestScore : this.data.bestLandings;
      return progress >= m.target;
    });
  }

  private loadData(): SaveData {
    const raw = this.adapter.load(STORAGE_KEYS.SAVE_DATA);
    if (!raw) return { ...DEFAULT_SAVE };
    try {
      return { ...DEFAULT_SAVE, ...(JSON.parse(raw) as Partial<SaveData>) };
    } catch {
      return { ...DEFAULT_SAVE };
    }
  }

  private persist(): void {
    this.adapter.save(STORAGE_KEYS.SAVE_DATA, JSON.stringify(this.data));
  }
}
