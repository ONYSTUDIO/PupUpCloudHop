import type { Player } from '@entities/Player';
import type { CloudIsland } from '@entities/CloudIsland';
import { GAMEPLAY } from '@config/gameplayConfig';

export class CollisionSystem {
  /**
   * 낙하 중인 플레이어가 구름섬 윗면에 닿았는지 검사한다.
   * 조건:
   *  1. 플레이어가 아래로 떨어지는 중 (vy > 0)
   *  2. 플레이어 바닥이 구름섬 윗면과 허용 오차 이내
   *  3. 플레이어 수평 범위가 구름섬 범위와 겹침
   *  4. 점프 직후 일정 시간(grace)은 출발 구름 무시
   */
  check(
    player: Player,
    clouds: CloudIsland[],
    jumpedFromId: string,
    jumpTime: number,
    now: number,
  ): CloudIsland | null {
    if (player.vy <= 0) return null;

    const gracePassed = now - jumpTime > GAMEPLAY.JUMP_GRACE_MS;
    const pBottom = player.bottom;
    const pLeft = player.left;
    const pRight = player.right;

    for (const cloud of clouds) {
      if (!gracePassed && cloud.id === jumpedFromId) continue;

      const cloudTop = cloud.topY;
      const withinY =
        pBottom >= cloudTop - GAMEPLAY.LAND_TOLERANCE_Y &&
        pBottom <= cloudTop + GAMEPLAY.LAND_TOLERANCE_Y + 18;
      const withinX = pLeft < cloud.rightX && pRight > cloud.leftX;

      if (withinY && withinX) {
        return cloud;
      }
    }

    return null;
  }
}
