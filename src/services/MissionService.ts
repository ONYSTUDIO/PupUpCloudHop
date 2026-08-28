import { supabase } from '@lib/supabase';
import { MISSION_TYPE_ID, type MissionDef } from '@config/missions';

export interface ClaimedMissionKey {
  mission_type: number;
  mission_id: number;
}

export class MissionService {
  /** 단일 미션 수령. 반환값: 실제 지급된 코인 (이미 수령했으면 0). */
  async claimMission(mission: MissionDef): Promise<number> {
    const { data, error } = await supabase.rpc('claim_mission', {
      p_mission_type: MISSION_TYPE_ID[mission.type],
      p_mission_id:   mission.stage,
      p_coin_reward:  mission.coinReward,
    });
    if (error) throw error;
    return data as number;
  }

  /** 미션 일괄 수령 (한 번에 획득). 반환값: 총 지급된 코인. */
  async claimAllMissions(missions: MissionDef[]): Promise<number> {
    const payload = missions.map((m) => ({
      mission_type: MISSION_TYPE_ID[m.type],
      mission_id:   m.stage,
      coin_reward:  m.coinReward,
    }));
    const { data, error } = await supabase.rpc('claim_all_missions', {
      p_missions: payload,
    });
    if (error) throw error;
    return data as number;
  }

  /**
   * 수령 완료 미션 목록 조회.
   * 비로그인 또는 오류 시 빈 배열 반환 (로컬 폴백으로 처리).
   */
  async getClaimedMissions(): Promise<ClaimedMissionKey[]> {
    const { data, error } = await supabase.rpc('get_claimed_missions');
    if (error) return [];
    return (data as unknown as ClaimedMissionKey[]) ?? [];
  }

  /** [개발·테스트 전용] 수령 내역 전체 초기화. */
  async resetClaimedMissions(): Promise<void> {
    const { error } = await supabase.rpc('reset_claimed_missions');
    if (error) throw error;
  }
}

export const missionService = new MissionService();
