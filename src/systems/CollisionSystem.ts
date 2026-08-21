import type { Player } from '@entities/Player';
import type { CloudIsland } from '@entities/CloudIsland';
import type { BirdFlock } from '@entities/Obstacle';
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
    landToleranceOverride?: number,
    landToleranceX = 0,
  ): CloudIsland | null {
    if (requireFalling && player.vy <= 0) return null;

    const tolerance = landToleranceOverride ?? GAMEPLAY.LAND_TOLERANCE_Y;
    const gracePassed = now - jumpTime > GAMEPLAY.JUMP_GRACE_MS;
    const pBottom = player.bottom;
    const pLeft = player.left;
    const pRight = player.right;

    for (const cloud of clouds) {
      if (!gracePassed && cloud.id === jumpedFromId) continue;

      const cloudTop = cloud.topY;
      const withinY =
        pBottom >= cloudTop - tolerance &&
        pBottom <= cloudTop + tolerance + 18;
      const withinX =
        pLeft < cloud.rightX + landToleranceX &&
        pRight > cloud.leftX - landToleranceX;

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

  /** 새떼가 구름섬의 풍선 영역에 닿는지 판정 — 이미 낙하 중인 구름은 제외 */
  checkBirdFlockCloud(
    flocks: BirdFlock[],
    clouds: CloudIsland[],
  ): { flock: BirdFlock; cloud: CloudIsland } | null {
    for (const flock of flocks) {
      const fLeft   = flock.x - flock.halfW;
      const fRight  = flock.x + flock.halfW;
      const fTop    = flock.y - flock.halfH;
      const fBottom = flock.y + flock.halfH;

      for (const cloud of clouds) {
        if (cloud.isFalling) continue;

        const hitX = fLeft  < cloud.x + cloud.balloonZoneHalfW &&
                     fRight > cloud.x - cloud.balloonZoneHalfW;
        const hitY = fBottom > cloud.balloonZoneTopY &&
                     fTop    < cloud.balloonZoneBottomY;

        if (hitX && hitY) return { flock, cloud };
      }
    }
    return null;
  }
}
