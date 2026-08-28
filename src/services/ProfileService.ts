import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/database.types';

export class ProfileService {
  private async getUserId(): Promise<string> {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw new Error('not authenticated');
    return data.user.id;
  }

  async getProfile(): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .single();
    if (error) return null;
    return data;
  }

  /** 코인 획득. 반환값: 변경 후 잔액. 음수 amount로 소비 가능. */
  async addCoins(amount: number): Promise<number> {
    const { data, error } = await supabase.rpc('add_coins', { amount });
    if (error) throw error;
    return data as number;
  }

  /** 코인 소비. 잔액 부족(check 제약 위반) 시 false 반환. */
  async spendCoins(amount: number): Promise<boolean> {
    try {
      await this.addCoins(-amount);
      return true;
    } catch {
      return false;
    }
  }

  /** 다이아몬드 획득. 반환값: 변경 후 잔액. */
  async addDiamonds(amount: number): Promise<number> {
    const { data, error } = await supabase.rpc('add_diamonds', { amount });
    if (error) throw error;
    return data as number;
  }

  /** 다이아몬드 소비. 잔액 부족 시 false 반환. */
  async spendDiamonds(amount: number): Promise<boolean> {
    try {
      await this.addDiamonds(-amount);
      return true;
    } catch {
      return false;
    }
  }

  /** 다이아몬드 → 코인 단방향 교환 (💎1 = 🪙150) */
  async exchangeDiamondsToCoins(diamondAmount: number): Promise<boolean> {
    const spent = await this.spendDiamonds(diamondAmount);
    if (!spent) return false;
    await this.addCoins(diamondAmount * 150);
    return true;
  }

  /**
   * 게임 종료 후 점수 제출.
   * 새 최고 기록이면 best_score도 갱신.
   */
  async submitScore(score: number, landings: number): Promise<{ isNewBest: boolean }> {
    const [profile, uid] = await Promise.all([this.getProfile(), this.getUserId()]);
    if (!profile) throw new Error('profile not found');

    const isNewBest        = score > profile.best_score;
    const isNewBestLanding = landings > profile.best_landings;

    const { error } = await supabase
      .from('profiles')
      .update({
        total_play_count: profile.total_play_count + 1,
        ...(isNewBest        ? { best_score: score }       : {}),
        ...(isNewBestLanding ? { best_landings: landings } : {}),
      })
      .eq('id', uid);

    if (error) throw error;
    return { isNewBest };
  }

  async updateUsername(username: string): Promise<void> {
    const uid = await this.getUserId();
    const { error } = await supabase
      .from('profiles')
      .update({ username })
      .eq('id', uid);
    if (error) throw error;
  }

  // ─── 룰렛 ─────────────────────────────────────────────────────

  /** 오늘 무료 스핀을 아직 사용하지 않았으면 true. */
  async canFreeRoulette(): Promise<boolean> {
    const profile = await this.getProfile();
    if (!profile) return true; // 비로그인: 로컬 판단에 맡김
    const today = new Date().toISOString().slice(0, 10);
    return profile.last_roulette_date !== today;
  }

  /** 오늘 사용한 유료 스핀 횟수 (0~3). 날짜가 다르면 0. */
  async getPaidRouletteSpinsToday(): Promise<number> {
    const profile = await this.getProfile();
    if (!profile) return 0;
    const today = new Date().toISOString().slice(0, 10);
    if (profile.last_roulette_date !== today) return 0;
    return profile.roulette_paid_spins_today;
  }

  /** 무료 스핀 사용 기록 (last_roulette_date = today, paid_spins = 0). */
  async recordFreeRoulette(): Promise<void> {
    const { error } = await supabase.rpc('record_free_roulette');
    if (error) throw error;
  }

  /**
   * 유료 스핀 다이아몬드 차감.
   * 반환값: 차감 후 남은 다이아몬드.
   * 다이아 부족 or 스핀 소진 시 에러 발생.
   */
  async spendPaidRoulette(): Promise<number> {
    const { data, error } = await supabase.rpc('spend_paid_roulette');
    if (error) throw error;
    return data as number;
  }

  /** [테스트용] DB의 룰렛 스핀 상태를 초기화. */
  async resetRouletteState(): Promise<void> {
    const uid = await this.getUserId();
    const { error } = await supabase
      .from('profiles')
      .update({ last_roulette_date: null, roulette_paid_spins_today: 0 })
      .eq('id', uid);
    if (error) throw error;
  }
}

export const profileService = new ProfileService();
