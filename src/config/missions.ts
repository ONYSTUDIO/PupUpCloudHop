export type MissionType = 'landing' | 'score';

// DB mission_type 정수값 매핑
export const MISSION_TYPE_ID: Record<MissionType, number> = {
  landing: 1,
  score:   2,
};

export interface MissionDef {
  readonly id: string;      // localStorage 키 (하위 호환 유지)
  readonly type: MissionType;
  readonly stage: number;   // DB mission_id — 타입 내 순번 (1, 2, 3, ...)
  readonly target: number;
  readonly label: string;
  readonly coinReward: number;
}

export const LANDING_MISSIONS: readonly MissionDef[] = [
  { id: 'land_5',   type: 'landing', stage: 1, target: 5,   label: '5회 착지 성공',   coinReward: 15  },
  { id: 'land_10',  type: 'landing', stage: 2, target: 10,  label: '10회 착지 성공',  coinReward: 35  },
  { id: 'land_20',  type: 'landing', stage: 3, target: 20,  label: '20회 착지 성공',  coinReward: 80  },
  { id: 'land_30',  type: 'landing', stage: 4, target: 30,  label: '30회 착지 성공',  coinReward: 150 },
  { id: 'land_50',  type: 'landing', stage: 5, target: 50,  label: '50회 착지 성공',  coinReward: 300 },
  { id: 'land_100', type: 'landing', stage: 6, target: 100, label: '100회 착지 성공', coinReward: 700 },
];

export const SCORE_MISSIONS: readonly MissionDef[] = [
  { id: 'score_20',  type: 'score', stage: 1, target: 20,  label: '최고 점수 20점 달성',  coinReward: 50  },
  { id: 'score_60',  type: 'score', stage: 2, target: 60,  label: '최고 점수 60점 달성',  coinReward: 120 },
  { id: 'score_120', type: 'score', stage: 3, target: 120, label: '최고 점수 120점 달성', coinReward: 250 },
  { id: 'score_200', type: 'score', stage: 4, target: 200, label: '최고 점수 200점 달성', coinReward: 500 },
];

export const ALL_MISSIONS: readonly MissionDef[] = [...LANDING_MISSIONS, ...SCORE_MISSIONS];
