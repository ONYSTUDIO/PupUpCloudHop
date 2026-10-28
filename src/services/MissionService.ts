import { supabase } from '@lib/supabase';
import type { MissionDef } from '@config/missions';

export interface TimedMissionClaimResult {
  coins: number;
  fragments: number;
  revivals: number;
  already_claimed: boolean;
}

export class MissionService {
  /** [개발·테스트 전용] permanent 미션 제거됨 (2026-10-26). no-op 유지. */
  // eslint-disable-next-line @typescript-eslint/require-await
  async resetClaimedMissions(): Promise<void> { /* no-op */ }

  /**
   * 일일/주간 미션 단일 수령. DB에서 중복 수령 방지 및 보상 지급.
   * already_claimed=true 이면 이미 수령한 것 (보상 0).
   * 오류 시 throw (영구 미션의 claimMission 과 동일 패턴).
   */
  async claimTimedMission(
    mission: MissionDef,
    periodKey: string,
  ): Promise<TimedMissionClaimResult> {
    // 보상은 로컬(SaveManager)에서 이미 지급됨 — DB에는 수령 기록만 남김(reward=0)
    const { data, error } = await supabase.rpc('claim_timed_mission', {
      p_mission_id:      mission.id,
      p_period_key:      periodKey,
      p_coin_reward:     0,
      p_fragment_reward: 0,
      p_revival_reward:  0,
    });
    if (error) throw error;
    return data as unknown as TimedMissionClaimResult;
  }

  /**
   * 특정 기간에 수령한 미션 ID 목록 반환.
   * 오류 또는 비로그인 시 빈 배열 반환.
   */
  async getClaimedTimedMissions(periodKey: string): Promise<string[]> {
    const { data, error } = await supabase.rpc('get_claimed_timed_missions', {
      p_period_key: periodKey,
    });
    if (error) return [];
    return (data as unknown as string[]) ?? [];
  }

  /**
   * [개발·테스트 전용] 특정 기간 수령 내역 초기화.
   */
  async resetTimedMissions(periodKey: string): Promise<void> {
    const { error } = await supabase.rpc('reset_timed_missions', {
      p_period_key: periodKey,
    });
    if (error) throw error;
  }

  /**
   * [개발·테스트 전용] 모든 기간 수령 내역 초기화.
   */
  async resetAllTimedMissions(): Promise<void> {
    const { error } = await supabase.rpc('reset_all_timed_missions');
    if (error) throw error;
  }
}

export const missionService = new MissionService();
