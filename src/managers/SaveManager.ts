import type { SaveData } from '@game-types/game';
import { STORAGE_KEYS } from '@config/constants';

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
  totalJumps: 0,
  gamesPlayed: 0,
  soundEnabled: true,
  vibrationEnabled: true,
};

export class SaveManager {
  private adapter: StorageAdapter;
  private data: SaveData;

  constructor(adapter: StorageAdapter = new LocalStorageAdapter()) {
    this.adapter = adapter;
    this.data = this.loadData();
  }

  getBestScore(): number { return this.data.bestScore; }
  isSoundEnabled(): boolean { return this.data.soundEnabled; }
  isVibrationEnabled(): boolean { return this.data.vibrationEnabled; }

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
    this.data.totalJumps += jumps;
    this.data.gamesPlayed += 1;
    this.persist();
    return isNewBest;
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
