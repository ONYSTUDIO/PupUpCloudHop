import Phaser from 'phaser';
import type { Player } from '@entities/Player';
import type { CloudIsland } from '@entities/CloudIsland';
import { GAMEPLAY } from '@config/gameplayConfig';

export class JumpSystem {
  /**
   * 충전 시간(ms)에 따라 점프 속도를 계산해 플레이어에게 적용한다.
   *
   * VY 계산 (높이):
   *   t < JUMP_VY_RAMP_END → 선형 증가
   *   t >= JUMP_VY_RAMP_END → JUMP_MAX_VY_MAG 에서 고정 (높이 상한)
   *
   * VX 계산 (넓이):
   *   t 0→1 에 걸쳐 선형 증가 → 길게 누를수록 더 멀리 날아감
   */
  jump(
    player: Player,
    clouds: CloudIsland[],
    currentCloudId: string,
    chargeDuration: number,
  ): boolean {
    if (!player.isOnGround || player.isDead) return false;

    const { vy, vxMax } = this.calcVelocities(chargeDuration);
    const target = this.findTarget(player, clouds, currentCloudId);

    player.isOnGround = false;
    player.vy = vy;

    if (target !== null) {
      const dx = target.x - player.x;
      // dx * 1.6 은 대략적인 방향 보정 계수; vxMax로 상한 설정
      player.vx = Phaser.Math.Clamp(dx * 1.6, -vxMax, vxMax);
    } else {
      player.vx = 0;
    }

    return true;
  }

  /** 충전 시간 → { vy (음수), vxMax } 변환 */
  calcVelocities(chargeDuration: number): { vy: number; vxMax: number } {
    const t = Phaser.Math.Clamp(
      (chargeDuration - GAMEPLAY.JUMP_CHARGE_MIN_MS) /
        (GAMEPLAY.JUMP_CHARGE_MAX_MS - GAMEPLAY.JUMP_CHARGE_MIN_MS),
      0,
      1,
    );

    // VY: RAMP_END 지점까지 증가, 이후 상한 고정
    const vyT = Math.min(t / GAMEPLAY.JUMP_VY_RAMP_END, 1);
    const vyMag = Phaser.Math.Linear(GAMEPLAY.JUMP_MIN_VY_MAG, GAMEPLAY.JUMP_MAX_VY_MAG, vyT);

    // VX: t 0→1 에 걸쳐 선형 증가
    const vxMax = Phaser.Math.Linear(GAMEPLAY.JUMP_MIN_VX, GAMEPLAY.JUMP_MAX_VX, t);

    return { vy: -vyMag, vxMax };
  }

  findTarget(player: Player, clouds: CloudIsland[], currentCloudId: string): CloudIsland | null {
    const others = clouds.filter((c) => c.id !== currentCloudId);
    if (others.length === 0) return null;

    const above = others.filter((c) => c.y < player.y - 60);
    const pool = above.length > 0 ? above : others;

    return pool.reduce<CloudIsland>((best, c) => {
      const db = Math.hypot(best.x - player.x, best.y - player.y);
      const dc = Math.hypot(c.x - player.x, c.y - player.y);
      return dc < db ? c : best;
    }, pool[0] as CloudIsland);
  }
}
