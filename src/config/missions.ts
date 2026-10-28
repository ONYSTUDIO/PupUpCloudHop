export type MissionPeriod = 'daily' | 'weekly';

export type MissionCondition =
  | 'landing'         // 착지 횟수 (daily: 오늘 / weekly: 이번 주)
  | 'score'           // 점수 달성 (daily: 오늘 최고 / weekly: 이번 주 최고)
  | 'item_pickup'     // 아이템 획득 (daily: 오늘 / weekly: 이번 주)
  | 'daily_complete'; // 일일 미션 전체 완료일 수 (weekly)

export interface MissionDef {
  readonly id: string;
  readonly period: MissionPeriod;
  readonly condition: MissionCondition;
  readonly stage: number;           // 타입 내 순번 (1, 2, 3, ...)
  readonly target: number;
  readonly label: string;
  readonly coinReward: number;
  readonly fragmentReward: number;  // 0이면 조각 미지급
  readonly revivalReward: number;   // 0이면 부활권 미지급
}

export const DAILY_MISSIONS: readonly MissionDef[] = [
  { id: 'daily_item_1',   period: 'daily', condition: 'item_pickup', stage: 1, target: 1,  label: '오늘 인게임 아이템 1개 획득', coinReward: 15, fragmentReward: 2, revivalReward: 0 },
  { id: 'daily_land_5',   period: 'daily', condition: 'landing',     stage: 1, target: 5,  label: '오늘 착지 5회 성공',          coinReward: 15, fragmentReward: 2, revivalReward: 0 },
  { id: 'daily_land_10',  period: 'daily', condition: 'landing',     stage: 2, target: 10, label: '오늘 착지 10회 성공',          coinReward: 20, fragmentReward: 3, revivalReward: 0 },
  { id: 'daily_score_20', period: 'daily', condition: 'score',       stage: 1, target: 20, label: '오늘 점수 20점 달성',           coinReward: 20, fragmentReward: 3, revivalReward: 0 },
  { id: 'daily_item_5',   period: 'daily', condition: 'item_pickup', stage: 2, target: 5,  label: '오늘 인게임 아이템 5개 획득', coinReward: 25, fragmentReward: 3, revivalReward: 0 },
  { id: 'daily_land_30',  period: 'daily', condition: 'landing',     stage: 3, target: 30, label: '오늘 착지 30회 성공',          coinReward: 35, fragmentReward: 4, revivalReward: 0 },
  { id: 'daily_score_40', period: 'daily', condition: 'score',       stage: 2, target: 40, label: '오늘 점수 40점 달성',           coinReward: 35, fragmentReward: 4, revivalReward: 0 },
];

export const WEEKLY_MISSIONS: readonly MissionDef[] = [
  { id: 'weekly_land_50',  period: 'weekly', condition: 'landing',        stage: 1, target: 50,  label: '이번 주 착지 누적 50회',        coinReward: 150, fragmentReward: 15, revivalReward: 0 },
  { id: 'weekly_score_40', period: 'weekly', condition: 'score',          stage: 1, target: 40,  label: '이번 주 최고점수 40점 달성',    coinReward: 100, fragmentReward: 10, revivalReward: 0 },
  { id: 'weekly_daily_3',  period: 'weekly', condition: 'daily_complete', stage: 1, target: 1,   label: '일일 미션 7개 전체 완료',        coinReward: 0,   fragmentReward: 12, revivalReward: 1 },
  { id: 'weekly_land_150', period: 'weekly', condition: 'landing',        stage: 2, target: 150, label: '이번 주 착지 누적 150회',       coinReward: 120, fragmentReward: 15, revivalReward: 0 },
  { id: 'weekly_item_20',  period: 'weekly', condition: 'item_pickup',    stage: 1, target: 20,  label: '이번 주 아이템 누적 20개 획득', coinReward: 70,  fragmentReward: 10, revivalReward: 0 },
];

export const ALL_MISSIONS: readonly MissionDef[] = [
  ...DAILY_MISSIONS,
  ...WEEKLY_MISSIONS,
];
