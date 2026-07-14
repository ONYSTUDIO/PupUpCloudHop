// SpawnSystem — 무한 스크롤 모드에서 동적 구름 생성에 사용 예정 (P1)
// 현재 프로토타입은 constants.ts의 INITIAL_CLOUD_LAYOUT을 사용함

export class SpawnSystem {
  private _topY: number = 0;

  setTopY(y: number): void {
    this._topY = y;
  }

  getTopY(): number {
    return this._topY;
  }
}
