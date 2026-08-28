export type MissionType = 'landing' | 'score';

export interface MissionDef {
  readonly id: string;
  readonly type: MissionType;
  readonly target: number;
  readonly label: string;
  readonly coinReward: number;
}

export const LANDING_MISSIONS: readonly MissionDef[] = [
  { id: 'land_5',   type: 'landing', target: 5,   label: '5회 착지 성공',   coinReward: 15  },
  { id: 'land_10',  type: 'landing', target: 10,  label: '10회 착지 성공',  coinReward: 35  },
  { id: 'land_20',  type: 'landing', target: 20,  label: '20회 착지 성공',  coinReward: 80  },
  { id: 'land_30',  type: 'landing', target: 30,  label: '30회 착지 성공',  coinReward: 150 },
  { id: 'land_50',  type: 'landing', target: 50,  label: '50회 착지 성공',  coinReward: 300 },
  { id: 'land_100', type: 'landing', target: 100, label: '100회 착지 성공', coinReward: 700 },
];

export const SCORE_MISSIONS: readonly MissionDef[] = [
  { id: 'score_20',  type: 'score', target: 20,  label: '최고 점수 20점 달성',  coinReward: 50  },
  { id: 'score_60',  type: 'score', target: 60,  label: '최고 점수 60점 달성',  coinReward: 120 },
  { id: 'score_120', type: 'score', target: 120, label: '최고 점수 120점 달성', coinReward: 250 },
  { id: 'score_200', type: 'score', target: 200, label: '최고 점수 200점 달성', coinReward: 500 },
];

export const ALL_MISSIONS: readonly MissionDef[] = [...LANDING_MISSIONS, ...SCORE_MISSIONS];
