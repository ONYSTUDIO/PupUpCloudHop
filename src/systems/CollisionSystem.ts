import type { Player } from '@entities/Player';
import type { CloudIsland } from '@entities/CloudIsland';
import { GAMEPLAY } from '@config/gameplayConfig';

export class CollisionSystem {
  /** 섬(잔디) 착지 성공 판정 */
  check(
    player: Player,
    clouds: CloudIsland[],
    jumpedFromId: string,
    jumpTime: number,
    now: number,
    requireFalling = true,
  ): CloudIsland | null {
    if (requireFalling && player.vy <= 0) return null;

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

  /**
   * 풍선 영역 충돌 판정 — 구름은 통과 허용, 풍선만 위험.
   * 섬 착지 check()보다 후순위로 호출한다.
   */
  checkDanger(
    player: Player,
    clouds: CloudIsland[],
    jumpedFromId: string,
    jumpTime: number,
    now: number,
  ): CloudIsland | null {
    const gracePassed = now - jumpTime > GAMEPLAY.JUMP_GRACE_MS;
    const pBottom = player.bottom;
    const pTop    = player.top;
    const pLeft   = player.left;
    const pRight  = player.right;

    for (const cloud of clouds) {
      if (!gracePassed && cloud.id === jumpedFromId) continue;

      // 풍선 레이어 AABB 겹침만 판정 (구름은 통과)
      const bHitX = pLeft  < cloud.x + cloud.balloonZoneHalfW &&
                    pRight > cloud.x - cloud.balloonZoneHalfW;
      const bHitY = pBottom > cloud.balloonZoneTopY &&
                    pTop    < cloud.balloonZoneBottomY;

      if (bHitX && bHitY) return cloud;
    }

    return null;
  }
}
