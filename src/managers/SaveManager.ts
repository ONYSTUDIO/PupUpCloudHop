import type { SaveData } from '@game-types/game';
import { STORAGE_KEYS } from '@config/constants';
import { ALL_MISSIONS, DAILY_MISSIONS, WEEKLY_MISSIONS } from '@config/missions';

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
  lastAttendanceDate: '',
  attendanceStreak: 0,
  attendanceDayClaimed: [false, false, false, false, false, false, false],
  // 아이템 조각
  fragments: 0,
  // 일일 미션
  lastDailyReset: '',
  dailyLandingCount: 0,
  dailyScoreReached: false,
  dailyItemPickedUp: false,
  dailyMissionClaimed: [],
  // 주간 미션
  lastWeeklyReset: '',
  weeklyTotalLandings: 0,
  weeklyBestScore: 0,
  weeklyDailyMissionDaysCompleted: 0,
  weeklyMissionClaimed: [],
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

  todayString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private yesterdayString(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /**
   * 이번 주 월요일의 'YYYY-MM-DD' 문자열 반환.
   * 주 기준: 월요일 시작.
   */
  mondayString(): string {
    const d = new Date();
    const day = d.getDay(); // 0=일, 1=월 ...
    const diff = day === 0 ? -6 : 1 - day; // 이번 주 월요일로 이동
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
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

  // ─── 아이템 조각 ──────────────────────────────────────────────

  getFragments(): number { return this.data.fragments ?? 0; }

  addFragments(amount: number): void {
    this.data.fragments = Math.max(0, (this.data.fragments ?? 0) + amount);
    this.persist();
  }

  /** 조각 소비. 잔량 부족 시 false 반환. */
  spendFragments(amount: number): boolean {
    if ((this.data.fragments ?? 0) < amount) return false;
    this.data.fragments -= amount;
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

  // ─── 미션 (permanent) ────────────────────────────────────

  getClaimedMissions(): ReadonlySet<string> {
    return new Set(this.data.claimedMissions);
  }

  /** permanent 미션을 수령 처리하고 코인을 지급. 이미 수령했거나 미달성이면 0 반환. */
  claimMission(id: string): number {
    if (this.data.claimedMissions.includes(id)) return 0;
    const mission = ALL_MISSIONS.find((m) => m.id === id && m.period === 'permanent');
    if (!mission) return 0;
    const progress = mission.condition === 'score'
      ? this.data.bestScore
      : this.data.bestLandings;
    if (progress < mission.target) return 0;
    this.data.claimedMissions.push(id);
    this.addCoins(mission.coinReward);
    return mission.coinReward;
  }

  // ─── 일일 미션 ────────────────────────────────────────────

  /** 특정 일일 미션 ID를 오늘 이미 수령했는지 확인 */
  isDailyMissionClaimed(id: string): boolean {
    return (this.data.dailyMissionClaimed ?? []).includes(id);
  }

  /** 특정 주간 미션 ID를 이번 주 이미 수령했는지 확인 */
  isWeeklyMissionClaimed(id: string): boolean {
    return (this.data.weeklyMissionClaimed ?? []).includes(id);
  }

  /**
   * 일일 미션 리셋 체크. MissionPopup 열 때 호출.
   * 오늘 날짜가 lastDailyReset 과 다르면 일일 진행도를 모두 초기화.
   */
  checkAndResetDailyMissions(): void {
    const today = this.todayString();
    if (this.data.lastDailyReset === today) return;
    this.data.dailyLandingCount = 0;
    this.data.dailyScoreReached = false;
    this.data.dailyItemPickedUp = false;
    this.data.dailyMissionClaimed = [];
    this.data.lastDailyReset = today;
    this.persist();
  }

  /**
   * 주간 미션 리셋 체크. MissionPopup 열 때 호출.
   * 이번 주 월요일이 lastWeeklyReset 과 다르면 주간 진행도를 모두 초기화.
   */
  checkAndResetWeeklyMissions(): void {
    const monday = this.mondayString();
    if (this.data.lastWeeklyReset === monday) return;
    this.data.weeklyTotalLandings = 0;
    this.data.weeklyBestScore = 0;
    this.data.weeklyDailyMissionDaysCompleted = 0;
    this.data.weeklyMissionClaimed = [];
    this.data.lastWeeklyReset = monday;
    this.persist();
  }

  /**
   * 게임 종료 시 일일·주간 진행도 업데이트.
   * GameScene의 finalizeGameOver 이후 호출.
   */
  updateDailyProgress(landingCount: number, score: number): void {
    // 일일 리셋 체크 (날짜 바뀐 채로 게임 종료 시 안전 처리)
    const today = this.todayString();
    if (this.data.lastDailyReset !== today) {
      this.data.dailyLandingCount = 0;
      this.data.dailyScoreReached = false;
      this.data.dailyItemPickedUp = false;
      this.data.dailyMissionClaimed = [];
      this.data.lastDailyReset = today;
    }
    // 주간 리셋 체크
    const monday = this.mondayString();
    if (this.data.lastWeeklyReset !== monday) {
      this.data.weeklyTotalLandings = 0;
      this.data.weeklyBestScore = 0;
      this.data.weeklyDailyMissionDaysCompleted = 0;
      this.data.weeklyMissionClaimed = [];
      this.data.lastWeeklyReset = monday;
    }

    // 일일 진행도 업데이트
    this.data.dailyLandingCount += landingCount;
    const scoreTarget = DAILY_MISSIONS.find((m) => m.id === 'daily_score_20')?.target ?? 20;
    if (score >= scoreTarget) this.data.dailyScoreReached = true;

    // 주간 진행도 업데이트
    this.data.weeklyTotalLandings += landingCount;
    if (score > this.data.weeklyBestScore) {
      this.data.weeklyBestScore = score;
    }

    this.persist();
  }

  /**
   * 인게임 아이템 픽업 시 호출.
   * dailyItemPickedUp = true, 아이템 조각 1개 자동 획득.
   */
  recordItemPickup(): void {
    this.data.dailyItemPickedUp = true;
    this.addFragments(1);
  }

  /**
   * 일일 미션 달성 현재 진행도 조회.
   * 'daily_score_20': 달성 여부를 boolean → target 값 또는 0으로 반환.
   */
  getDailyMissionProgress(id: string): number {
    switch (id) {
      case 'daily_land_10':  return this.data.dailyLandingCount ?? 0;
      case 'daily_score_20': {
        const t = DAILY_MISSIONS.find((m) => m.id === 'daily_score_20')?.target ?? 20;
        return (this.data.dailyScoreReached ?? false) ? t : 0;
      }
      case 'daily_item_1':   return (this.data.dailyItemPickedUp ?? false) ? 1 : 0;
      default:               return 0;
    }
  }

  /**
   * 일일 미션 수령.
   * 이미 수령했거나 미달성이면 { coins: 0, fragments: 0, revival: 0 } 반환.
   * 성공 시 보상 지급 후 오늘 3개 모두 완료되면 weeklyDailyMissionDaysCompleted 증가.
   */
  claimDailyMission(id: string): { coins: number; fragments: number; revival: number } {
    const empty = { coins: 0, fragments: 0, revival: 0 };
    if ((this.data.dailyMissionClaimed ?? []).includes(id)) return empty;

    const mission = DAILY_MISSIONS.find((m) => m.id === id);
    if (!mission) return empty;

    const progress = this.getDailyMissionProgress(id);
    if (progress < mission.target) return empty;

    // 보상 지급
    if (mission.coinReward > 0)     this.addCoins(mission.coinReward);
    if (mission.fragmentReward > 0) this.addFragments(mission.fragmentReward);
    if (mission.revivalReward > 0)  this.addRevivalItem(mission.revivalReward);

    this.data.dailyMissionClaimed = [...(this.data.dailyMissionClaimed ?? []), id];

    // 오늘 일일 미션 3개 전부 완료 시 weeklyDailyMissionDaysCompleted 증가
    const allDailyIds = DAILY_MISSIONS.map((m) => m.id);
    const allClaimed = allDailyIds.every((mid) => this.data.dailyMissionClaimed.includes(mid));
    if (allClaimed) {
      this.data.weeklyDailyMissionDaysCompleted = (this.data.weeklyDailyMissionDaysCompleted ?? 0) + 1;
    }

    this.persist();
    return { coins: mission.coinReward, fragments: mission.fragmentReward, revival: mission.revivalReward };
  }

  // ─── 주간 미션 ────────────────────────────────────────────

  /**
   * 주간 미션 달성 현재 진행도 조회.
   */
  getWeeklyMissionProgress(id: string): number {
    switch (id) {
      case 'weekly_land_50':  return this.data.weeklyTotalLandings ?? 0;
      case 'weekly_score_40': return this.data.weeklyBestScore ?? 0;
      case 'weekly_daily_3':  return this.data.weeklyDailyMissionDaysCompleted ?? 0;
      default:                return 0;
    }
  }

  /**
   * 주간 미션 수령.
   * 이미 수령했거나 미달성이면 { coins: 0, fragments: 0, revival: 0 } 반환.
   */
  claimWeeklyMission(id: string): { coins: number; fragments: number; revival: number } {
    const empty = { coins: 0, fragments: 0, revival: 0 };
    if ((this.data.weeklyMissionClaimed ?? []).includes(id)) return empty;

    const mission = WEEKLY_MISSIONS.find((m) => m.id === id);
    if (!mission) return empty;

    const progress = this.getWeeklyMissionProgress(id);
    if (progress < mission.target) return empty;

    // 보상 지급
    if (mission.coinReward > 0)     this.addCoins(mission.coinReward);
    if (mission.fragmentReward > 0) this.addFragments(mission.fragmentReward);
    if (mission.revivalReward > 0)  this.addRevivalItem(mission.revivalReward);

    this.data.weeklyMissionClaimed = [...(this.data.weeklyMissionClaimed ?? []), id];
    this.persist();
    return { coins: mission.coinReward, fragments: mission.fragmentReward, revival: mission.revivalReward };
  }

  // ─── 출석 체크 ────────────────────────────────────────────

  getAttendanceDayClaimed(): boolean[] {
    const arr = this.data.attendanceDayClaimed;
    if (!Array.isArray(arr) || arr.length !== 7) {
      return [false, false, false, false, false, false, false];
    }
    return [...arr];
  }

  /**
   * 오늘 새로운 출석일인지 확인.
   * isNewDay=true → 팝업 표시 (미수령), false → 이미 수령 완료.
   * dayIndex: 0~6, 오늘 해당하는 보상 칸 (0-based).
   */
  checkAttendance(): { isNewDay: boolean; dayIndex: number } {
    const today = this.todayString();
    if (this.data.lastAttendanceDate === today) {
      return { isNewDay: false, dayIndex: Math.max(0, this.data.attendanceStreak - 1) };
    }
    const yesterday = this.yesterdayString();
    if (this.data.lastAttendanceDate === yesterday && this.data.attendanceStreak > 0) {
      let next = this.data.attendanceStreak + 1;
      if (next > 7) next = 1;
      return { isNewDay: true, dayIndex: next - 1 };
    }
    return { isNewDay: true, dayIndex: 0 };
  }

  /**
   * 오늘 출석 보상 지급 및 상태 갱신.
   * 반환값: 실제 지급한 보상. 이미 수령한 날이면 { coins: 0, fragments: 0, revival: 0 }.
   * docs/ECONOMY_DESIGN.md 기준 출석 보상 배열.
   */
  claimAttendance(): { coins: number; fragments: number; revival: number } {
    const empty = { coins: 0, fragments: 0, revival: 0 };
    const today = this.todayString();
    if (this.data.lastAttendanceDate === today) return empty;

    const yesterday = this.yesterdayString();
    let newStreak: number;
    let resetCycle = false;

    if (this.data.lastAttendanceDate === yesterday && this.data.attendanceStreak > 0) {
      newStreak = this.data.attendanceStreak + 1;
      if (newStreak > 7) {
        newStreak = 1;
        resetCycle = true;
      }
    } else {
      newStreak = 1;
      resetCycle = true;
    }

    if (resetCycle) {
      this.data.attendanceDayClaimed = [false, false, false, false, false, false, false];
    }

    const dayIndex = newStreak - 1;
    // day 3(index 2): coins:80, day 5(index 4): fragments:10, day 7(index 6): revival:1+coins:200
    const ATTENDANCE_REWARDS = [
      { coins: 30 },
      { coins: 50 },
      { coins: 80 },
      { coins: 80 },
      { fragments: 10 },
      { coins: 100 },
      { revival: 1, coins: 200 },
    ] as const;

    const r = ATTENDANCE_REWARDS[dayIndex]!;
    const result = { coins: 0, fragments: 0, revival: 0 };

    if ('coins'     in r) { this.addCoins(r.coins);           result.coins     = r.coins;     }
    if ('fragments' in r) { this.addFragments(r.fragments);   result.fragments = r.fragments; }
    if ('revival'   in r) { this.addRevivalItem(r.revival);   result.revival   = r.revival;   }

    this.data.attendanceStreak = newStreak;
    this.data.attendanceDayClaimed[dayIndex] = true;
    this.data.lastAttendanceDate = today;
    this.persist();
    return result;
  }

  /** [테스트용] 출석 상태를 초기화해 다시 팝업이 뜨도록 한다. */
  resetAttendanceState(): void {
    this.data.lastAttendanceDate = '';
    this.data.attendanceStreak = 0;
    this.data.attendanceDayClaimed = [false, false, false, false, false, false, false];
    this.persist();
  }

  // ──────────────────────────────────────────────────────────

  /** [테스트용] permanent 수령 완료 미션을 모두 초기화해 다시 수령 가능 상태로 되돌린다. */
  resetClaimedMissions(): void {
    this.data.claimedMissions = [];
    this.persist();
  }

  /** [테스트용] 일일 미션 상태를 초기화해 다시 리셋되도록 한다. */
  resetDailyMissions(): void {
    this.data.lastDailyReset = '';
    this.persist();
  }

  /** [테스트용] 주간 미션 상태를 초기화해 다시 리셋되도록 한다. */
  resetWeeklyMissions(): void {
    this.data.lastWeeklyReset = '';
    this.persist();
  }

  /** DB에서 수령됐음을 로컬에 반영하고 보상도 지급. 이미 기록됐거나 알 수 없는 ID면 null 반환. */
  forceDailyMissionClaimed(id: string): { coins: number; fragments: number; revival: number } | null {
    if ((this.data.dailyMissionClaimed ?? []).includes(id)) return null;
    const mission = DAILY_MISSIONS.find((m) => m.id === id);
    if (!mission) return null; // 알 수 없는 ID(월요일 weekly ID 혼입 등)는 무시
    this.data.dailyMissionClaimed = [...(this.data.dailyMissionClaimed ?? []), id];
    const result = { coins: 0, fragments: 0, revival: 0 };
    if (mission.coinReward     > 0) { this.addCoins(mission.coinReward);          result.coins     = mission.coinReward; }
    if (mission.fragmentReward > 0) { this.addFragments(mission.fragmentReward);  result.fragments = mission.fragmentReward; }
    if (mission.revivalReward  > 0) { this.addRevivalItem(mission.revivalReward); result.revival   = mission.revivalReward; }
    const allDailyIds = DAILY_MISSIONS.map((m) => m.id);
    const allClaimed = allDailyIds.every((mid) => this.data.dailyMissionClaimed.includes(mid));
    if (allClaimed) {
      this.data.weeklyDailyMissionDaysCompleted = (this.data.weeklyDailyMissionDaysCompleted ?? 0) + 1;
    }
    this.persist();
    return result;
  }

  /** DB에서 수령됐음을 로컬에 반영하고 보상도 지급. 이미 기록됐거나 알 수 없는 ID면 null 반환. */
  forceWeeklyMissionClaimed(id: string): { coins: number; fragments: number; revival: number } | null {
    if ((this.data.weeklyMissionClaimed ?? []).includes(id)) return null;
    const mission = WEEKLY_MISSIONS.find((m) => m.id === id);
    if (!mission) return null; // 알 수 없는 ID는 무시
    this.data.weeklyMissionClaimed = [...(this.data.weeklyMissionClaimed ?? []), id];
    const result = { coins: 0, fragments: 0, revival: 0 };
    if (mission.coinReward     > 0) { this.addCoins(mission.coinReward);          result.coins     = mission.coinReward; }
    if (mission.fragmentReward > 0) { this.addFragments(mission.fragmentReward);  result.fragments = mission.fragmentReward; }
    if (mission.revivalReward  > 0) { this.addRevivalItem(mission.revivalReward); result.revival   = mission.revivalReward; }
    this.persist();
    return result;
  }

  /**
   * 수령 가능한(달성됐지만 미수령인) 미션이 하나라도 있으면 true.
   * permanent + 일일 + 주간 모두 확인.
   */
  hasPendingMissions(): boolean {
    // permanent 미션
    const claimed = new Set(this.data.claimedMissions);
    const hasPermanent = ALL_MISSIONS
      .filter((m) => m.period === 'permanent')
      .some((m) => {
        if (claimed.has(m.id)) return false;
        const progress = m.condition === 'score' ? this.data.bestScore : this.data.bestLandings;
        return progress >= m.target;
      });
    if (hasPermanent) return true;

    // 일일 미션
    const dailyClaimed = new Set(this.data.dailyMissionClaimed ?? []);
    const hasDaily = DAILY_MISSIONS.some((m) => {
      if (dailyClaimed.has(m.id)) return false;
      return this.getDailyMissionProgress(m.id) >= m.target;
    });
    if (hasDaily) return true;

    // 주간 미션
    const weeklyClaimed = new Set(this.data.weeklyMissionClaimed ?? []);
    return WEEKLY_MISSIONS.some((m) => {
      if (weeklyClaimed.has(m.id)) return false;
      return this.getWeeklyMissionProgress(m.id) >= m.target;
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
