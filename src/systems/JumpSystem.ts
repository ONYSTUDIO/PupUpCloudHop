import Phaser from 'phaser';
import type { Player } from '@entities/Player';
import type { CloudIsland } from '@entities/CloudIsland';
import { JumpPatternType } from '@game-types/game';
import { GAMEPLAY } from '@config/gameplayConfig';

export class JumpSystem {
  jump(
    player: Player,
    clouds: CloudIsland[],
    currentCloudId: string,
    chargeDuration: number,
    pattern: JumpPatternType,
  ): boolean {
    if (!player.isOnGround || player.isDead) return false;

    player.isOnGround = false;
    const target = this.findTarget(player, clouds, currentCloudId);

    if (pattern === JumpPatternType.PATTERN_1) {
      this.applyParabolicVelocity(player, target, chargeDuration);
    } else {
      this.applyStraightVelocity(player, target, chargeDuration);
    }

    return true;
  }

  // ─── 패턴 1: 포물선 ────────────────────────────────────

  private applyParabolicVelocity(
    player: Player,
    target: CloudIsland | null,
    chargeDuration: number,
  ): void {
    const { vy, vxMax } = this.calcParabolicVelocities(chargeDuration);
    player.vy = vy;
    if (target !== null) {
      const dx = target.x - player.x;
      player.vx = Phaser.Math.Clamp(dx * 1.6, -vxMax, vxMax);
    } else {
      player.vx = 0;
    }
  }

  calcParabolicVelocities(chargeDuration: number): { vy: number; vxMax: number } {
    const t = Phaser.Math.Clamp(
      (chargeDuration - GAMEPLAY.JUMP_CHARGE_MIN_MS) /
        (GAMEPLAY.JUMP_CHARGE_MAX_MS - GAMEPLAY.JUMP_CHARGE_MIN_MS),
      0,
      1,
    );
    const vyT = Math.min(t / GAMEPLAY.JUMP_VY_RAMP_END, 1);
    const vyMag = Phaser.Math.Linear(GAMEPLAY.JUMP_MIN_VY_MAG, GAMEPLAY.JUMP_MAX_VY_MAG, vyT);
    const vxMax = Phaser.Math.Linear(GAMEPLAY.JUMP_MIN_VX, GAMEPLAY.JUMP_MAX_VX, t);
    return { vy: -vyMag, vxMax };
  }

  // ─── 패턴 2: 대각선 직선 ───────────────────────────────

  private applyStraightVelocity(
    player: Player,
    target: CloudIsland | null,
    chargeDuration: number,
  ): void {
    const t = Phaser.Math.Clamp(
      (chargeDuration - GAMEPLAY.JUMP_CHARGE_MIN_MS) /
        (GAMEPLAY.JUMP_CHARGE_MAX_MS - GAMEPLAY.JUMP_CHARGE_MIN_MS),
      0,
      1,
    );
    const speed = Phaser.Math.Linear(
      GAMEPLAY.JUMP_STRAIGHT_MIN_SPEED,
      GAMEPLAY.JUMP_STRAIGHT_MAX_SPEED,
      t,
    );

    if (target !== null) {
      const dx = target.x - player.x;
      const dy = target.topY - player.bottom;
      const dist = Math.hypot(dx, dy);
      if (dist > 0) {
        player.vx = (dx / dist) * speed;
        player.vy = (dy / dist) * speed;
      } else {
        player.vx = 0;
        player.vy = -speed;
      }
    } else {
      player.vx = 0;
      player.vy = -speed;
    }
  }

  // ─── 공통 유틸 ─────────────────────────────────────────

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
