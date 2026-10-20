export type MissionPeriod = 'permanent' | 'daily' | 'weekly';

export type MissionCondition =
  | 'landing'         // 착지 횟수 (permanent: 누적 / daily: 오늘 / weekly: 이번 주)
  | 'score'           // 점수 달성 (permanent: 최고 / daily: 오늘 / weekly: 이번 주 최고)
  | 'item_pickup'     // 아이템 획득 (daily: 오늘)
  | 'daily_complete'; // 일일 미션 전체 완료일 수 (weekly)

/** @deprecated MissionCondition 을 사용할 것. permanent 미션 하위 호환용으로만 유지. */
export type MissionType = 'landing' | 'score';

// DB mission_type 정수값 매핑 — permanent 미션 전용 (하위 호환 유지)
export const MISSION_TYPE_ID: Record<MissionType, number> = {
  landing: 1,
  score:   2,
};

export interface MissionDef {
  readonly id: string;               // localStorage 키 (하위 호환 유지)
  readonly period: MissionPeriod;
  readonly condition: MissionCondition;
  /** @deprecated type 은 permanent 미션 하위 호환용. condition 을 우선 사용. */
  readonly type?: MissionType;
  readonly stage: number;            // DB mission_id — 타입 내 순번 (1, 2, 3, ...)
  readonly target: number;
  readonly label: string;
  readonly coinReward: number;
  readonly fragmentReward: number;   // 0이면 조각 미지급
  readonly revivalReward: number;    // 0이면 부활권 미지급
}

export const LANDING_MISSIONS: readonly MissionDef[] = [
  { id: 'land_5',   period: 'permanent', condition: 'landing', type: 'landing', stage: 1, target: 5,   label: '5회 착지 성공',   coinReward: 15,  fragmentReward: 0, revivalReward: 0 },
  { id: 'land_10',  period: 'permanent', condition: 'landing', type: 'landing', stage: 2, target: 10,  label: '10회 착지 성공',  coinReward: 35,  fragmentReward: 0, revivalReward: 0 },
  { id: 'land_20',  period: 'permanent', condition: 'landing', type: 'landing', stage: 3, target: 20,  label: '20회 착지 성공',  coinReward: 80,  fragmentReward: 0, revivalReward: 0 },
  { id: 'land_30',  period: 'permanent', condition: 'landing', type: 'landing', stage: 4, target: 30,  label: '30회 착지 성공',  coinReward: 150, fragmentReward: 0, revivalReward: 0 },
  { id: 'land_50',  period: 'permanent', condition: 'landing', type: 'landing', stage: 5, target: 50,  label: '50회 착지 성공',  coinReward: 300, fragmentReward: 0, revivalReward: 0 },
  { id: 'land_100', period: 'permanent', condition: 'landing', type: 'landing', stage: 6, target: 100, label: '100회 착지 성공', coinReward: 700, fragmentReward: 0, revivalReward: 0 },
];

export const SCORE_MISSIONS: readonly MissionDef[] = [
  { id: 'score_20',  period: 'permanent', condition: 'score', type: 'score', stage: 1, target: 20,  label: '최고 점수 20점 달성',  coinReward: 50,  fragmentReward: 0, revivalReward: 0 },
  { id: 'score_60',  period: 'permanent', condition: 'score', type: 'score', stage: 2, target: 60,  label: '최고 점수 60점 달성',  coinReward: 120, fragmentReward: 0, revivalReward: 0 },
  { id: 'score_120', period: 'permanent', condition: 'score', type: 'score', stage: 3, target: 120, label: '최고 점수 120점 달성', coinReward: 250, fragmentReward: 0, revivalReward: 0 },
  { id: 'score_200', period: 'permanent', condition: 'score', type: 'score', stage: 4, target: 200, label: '최고 점수 200점 달성', coinReward: 500, fragmentReward: 0, revivalReward: 0 },
];

export const DAILY_MISSIONS: readonly MissionDef[] = [
  { id: 'daily_land_10',  period: 'daily', condition: 'landing',     stage: 1, target: 10, label: '오늘 착지 10회 성공',        coinReward: 20, fragmentReward: 3,  revivalReward: 0 },
  { id: 'daily_score_20', period: 'daily', condition: 'score',       stage: 1, target: 20, label: '오늘 점수 20점 달성',         coinReward: 20, fragmentReward: 3,  revivalReward: 0 },
  { id: 'daily_item_1',   period: 'daily', condition: 'item_pickup', stage: 1, target: 1,  label: '오늘 인게임 아이템 1개 획득', coinReward: 15, fragmentReward: 2,  revivalReward: 0 },
];

export const WEEKLY_MISSIONS: readonly MissionDef[] = [
  { id: 'weekly_land_50',  period: 'weekly', condition: 'landing',        stage: 1, target: 50, label: '이번 주 착지 누적 50회',     coinReward: 150, fragmentReward: 15, revivalReward: 0 },
  { id: 'weekly_score_40', period: 'weekly', condition: 'score',          stage: 1, target: 40, label: '이번 주 최고 점수 40점 달성', coinReward: 100, fragmentReward: 10, revivalReward: 0 },
  { id: 'weekly_daily_3',  period: 'weekly', condition: 'daily_complete', stage: 1, target: 3,  label: '이번 주 일일 미션 3일 완료',  coinReward: 0,   fragmentReward: 12, revivalReward: 1 },
];

export const ALL_MISSIONS: readonly MissionDef[] = [
  ...LANDING_MISSIONS,
  ...SCORE_MISSIONS,
  ...DAILY_MISSIONS,
  ...WEEKLY_MISSIONS,
];
