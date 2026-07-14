// 장애물 — P1 구현 예정, 현재 스텁
export type ObstacleType = 'bird' | 'lightning';

export interface ObstacleData {
  type: ObstacleType;
  x: number;
  y: number;
}
