import Phaser from 'phaser';
import { SCENE_KEYS, DEPTH } from '@config/constants';
import { BASE_WIDTH, BASE_HEIGHT } from '@config/gameConfig';
import { SaveManager } from '@managers/SaveManager';
import { profileService } from '@services/ProfileService';
import { inventoryService } from '@services/InventoryService';
import type { ItemType } from '@services/InventoryService';

interface RouletteSceneData {
  from?: string;
}

interface RewardSlot {
  wheelLabel: string;
  popupLabel: string;
  type: 'coins' | 'diamonds' | 'shield' | 'magnet';
  value: number;
  bgColor: number;
  probability: number;
}

const REWARDS: RewardSlot[] = [
  { wheelLabel: '🪙\n30',    popupLabel: '🪙 코인 30개',      type: 'coins',    value: 30,  bgColor: 0x1a3a8a, probability: 0.25 },
  { wheelLabel: '🪙\n60',    popupLabel: '🪙 코인 60개',      type: 'coins',    value: 60,  bgColor: 0x2255bb, probability: 0.18 },
  { wheelLabel: '🪙\n100',   popupLabel: '🪙 코인 100개',     type: 'coins',    value: 100, bgColor: 0x1a7744, probability: 0.13 },
  { wheelLabel: '🛡️\n방어막', popupLabel: '🛡️ 방어막 1회',   type: 'shield',   value: 1,   bgColor: 0x6611aa, probability: 0.15 },
  { wheelLabel: '🧲\n자석',   popupLabel: '🧲 자석 1회',      type: 'magnet',   value: 1,   bgColor: 0x118899, probability: 0.12 },
  { wheelLabel: '🪙\n200',   popupLabel: '🪙 코인 200개',     type: 'coins',    value: 200, bgColor: 0xbb8800, probability: 0.08 },
  { wheelLabel: '💎\n1개',   popupLabel: '💎 다이아몬드 1개', type: 'diamonds', value: 1,   bgColor: 0xaa1177, probability: 0.06 },
  { wheelLabel: '💎\n3개',   popupLabel: '💎 다이아몬드 3개', type: 'diamonds', value: 3,   bgColor: 0xaa1111, probability: 0.03 },
];

const SLICE = (Math.PI * 2) / 8;
const CX = BASE_WIDTH / 2;
const WHEEL_Y = 660;
const WHEEL_R = 220;
const BTN_Y = 1065;
const BTN_W = 460;
const BTN_H = 110;
const PAID_COSTS = [2, 3, 5] as const;

export class RouletteScene extends Phaser.Scene {
  private saveManager!: SaveManager;
  private fromScene = SCENE_KEYS.TITLE as string;
  private wheelContainer!: Phaser.GameObjects.Container;
  private spinning = false;

  private currencyText!: Phaser.GameObjects.Text;
  private spinBtnBg!: Phaser.GameObjects.Graphics;
  private spinBtnLabel!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private exhaustedText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENE_KEYS.ROULETTE });
  }

  create(data?: RouletteSceneData): void {
    this.saveManager = new SaveManager();
    this.fromScene = data?.from ?? SCENE_KEYS.TITLE;
    this.spinning = false;

    const D = DEPTH.HUD;
    this.buildPanel(D);
    this.buildHeader(D + 2);
    this.buildWheel(D + 3);
    this.buildPointer(D + 5);
    this.buildSpinArea(D + 4);
    this.buildResetButton(D + 4);
    this.buildCloseButton(D + 6);
  }

  // ── Panel ──────────────────────────────────────────────────────

  private buildPanel(depth: number): void {
    this.add
      .rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, 0x000000, 0.78)
      .setOrigin(0, 0).setDepth(depth).setScrollFactor(0);

    const pw = BASE_WIDTH - 80;
    const ph = BASE_HEIGHT - 200;
    const g = this.add.graphics().setDepth(depth + 1).setScrollFactor(0);
    g.fillStyle(0x0d1a33, 1);
    g.fillRoundedRect(CX - pw / 2, BASE_HEIGHT / 2 - ph / 2, pw, ph, 30);
    g.lineStyle(3, 0x3d66bb, 1);
    g.strokeRoundedRect(CX - pw / 2, BASE_HEIGHT / 2 - ph / 2, pw, ph, 30);
  }

  // ── Header ────────────────────────────────────────────────────

  private buildHeader(depth: number): void {
    this.add.text(CX, 175, '🎡 룰렛', {
      fontSize: '72px', fontStyle: 'bold',
      color: '#ffe066', stroke: '#996600', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(depth).setScrollFactor(0);

    this.currencyText = this.add.text(CX, 268, this.currencyStr(), {
      fontSize: '40px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(depth).setScrollFactor(0);
  }

  private currencyStr(): string {
    return `🪙 ${this.saveManager.getCoins()}   💎 ${this.saveManager.getDiamonds()}`;
  }

  // ── Roulette wheel ────────────────────────────────────────────

  private buildWheel(depth: number): void {
    this.wheelContainer = this.add.container(CX, WHEEL_Y)
      .setDepth(depth).setScrollFactor(0);

    const g = this.add.graphics();

    // Sector fills
    for (let i = 0; i < 8; i++) {
      const sa = -Math.PI / 2 + i * SLICE;
      const ea = sa + SLICE;
      g.fillStyle(REWARDS[i]!.bgColor, 1);
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, WHEEL_R, sa, ea, false);
      g.closePath();
      g.fillPath();
    }

    // Gold outer ring
    g.lineStyle(8, 0xddaa00, 1);
    g.strokeCircle(0, 0, WHEEL_R + 4);

    // White border + dividers
    g.lineStyle(3, 0xffffff, 0.55);
    g.strokeCircle(0, 0, WHEEL_R);
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + i * SLICE;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * WHEEL_R, Math.sin(a) * WHEEL_R);
      g.strokePath();
    }

    // Center hub
    g.fillStyle(0x0d1a33, 1); g.fillCircle(0, 0, 26);
    g.fillStyle(0xddaa00, 1); g.fillCircle(0, 0, 18);
    g.fillStyle(0xffffff, 1); g.fillCircle(0, 0, 8);

    this.wheelContainer.add(g);

    // Slot labels
    for (let i = 0; i < 8; i++) {
      const mid = -Math.PI / 2 + i * SLICE + SLICE / 2;
      const r = WHEEL_R * 0.62;
      const txt = this.add.text(
        Math.cos(mid) * r, Math.sin(mid) * r,
        REWARDS[i]!.wheelLabel,
        { fontSize: '30px', fontStyle: 'bold', color: '#ffffff', stroke: '#000000', strokeThickness: 3, align: 'center' },
      ).setOrigin(0.5, 0.5);
      this.wheelContainer.add(txt);
    }
  }

  // ── Pointer ───────────────────────────────────────────────────

  private buildPointer(depth: number): void {
    const g = this.add.graphics().setDepth(depth).setScrollFactor(0);
    const tipY = WHEEL_Y - WHEEL_R - 2;
    const hw = 24;
    const ph = 44;
    g.fillStyle(0xffdd00, 1);
    g.lineStyle(2, 0xaa7700, 1);
    g.beginPath();
    g.moveTo(CX - hw, tipY - ph);
    g.lineTo(CX + hw, tipY - ph);
    g.lineTo(CX, tipY);
    g.closePath();
    g.fillPath();
    g.strokePath();
  }

  // ── Spin area ─────────────────────────────────────────────────

  private buildSpinArea(depth: number): void {
    this.spinBtnBg = this.add.graphics().setDepth(depth).setScrollFactor(0);

    this.spinBtnLabel = this.add.text(CX, BTN_Y, '', {
      fontSize: '48px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(depth + 1).setScrollFactor(0);

    const hitZone = this.add
      .zone(CX, BTN_Y, BTN_W, BTN_H)
      .setDepth(depth + 2).setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    hitZone.on('pointerdown', () => this.handleSpinPress());
    hitZone.on('pointerover', () => this.spinBtnBg.setAlpha(0.8));
    hitZone.on('pointerout',  () => this.spinBtnBg.setAlpha(1.0));

    this.statusText = this.add.text(CX, BTN_Y + 82, '', {
      fontSize: '32px', color: '#99bbdd',
    }).setOrigin(0.5).setDepth(depth + 1).setScrollFactor(0);

    this.exhaustedText = this.add.text(CX, BTN_Y + 170, '', {
      fontSize: '30px', color: '#888888', align: 'center',
    }).setOrigin(0.5).setDepth(depth + 1).setScrollFactor(0);

    this.refreshSpinUI();
  }

  private refreshSpinUI(): void {
    const canFree = this.saveManager.canFreeRoulette();
    const paidUsed = this.saveManager.getPaidRouletteSpinsToday();
    const canPaid = paidUsed < PAID_COSTS.length;
    const canSpin = canFree || canPaid;

    this.spinBtnBg.clear();
    const color = !canSpin ? 0x555555 : canFree ? 0x1a9944 : 0x1a55cc;
    const bx = CX - BTN_W / 2;
    const by = BTN_Y - BTN_H / 2;
    this.spinBtnBg.fillStyle(color, 1);
    this.spinBtnBg.fillRoundedRect(bx, by, BTN_W, BTN_H, 26);
    this.spinBtnBg.lineStyle(3, 0xffffff, canSpin ? 0.7 : 0.25);
    this.spinBtnBg.strokeRoundedRect(bx, by, BTN_W, BTN_H, 26);

    if (!canSpin) {
      this.spinBtnLabel.setText('스핀 완료');
    } else if (canFree) {
      this.spinBtnLabel.setText('✨ 무료 스핀!');
    } else {
      this.spinBtnLabel.setText(`💎 ${PAID_COSTS[paidUsed]}  스핀하기`);
    }

    if (canFree) {
      this.statusText.setText('오늘 무료 스핀 1회 남음!');
    } else if (canPaid) {
      this.statusText.setText(`유료 스핀 ${paidUsed}/${PAID_COSTS.length} 사용`);
    } else {
      this.statusText.setText('');
    }

    this.exhaustedText.setText(
      !canSpin ? '오늘은 더 이상 스핀할 수 없어요\n내일 다시 도전하세요! 😊' : '',
    );
  }

  // ── Close button ──────────────────────────────────────────────

  private buildCloseButton(depth: number): void {
    const bx = BASE_WIDTH - 80;
    const by = 80;
    const bg = this.add.graphics().setDepth(depth).setScrollFactor(0);
    bg.fillStyle(0xcc3333, 1);
    bg.fillCircle(bx, by, 36);

    const label = this.add.text(bx, by, '✕', {
      fontSize: '48px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(depth + 1).setScrollFactor(0);

    const hit = this.add.circle(bx, by, 44)
      .setDepth(depth + 2).setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { bg.setAlpha(0.8); label.setAlpha(0.8); });
    hit.on('pointerout',  () => { bg.setAlpha(1);   label.setAlpha(1); });
    hit.on('pointerdown', () => this.closeScene());
  }

  // ── Spin logic ────────────────────────────────────────────────

  private handleSpinPress(): void {
    if (this.spinning) return;

    const canFree = this.saveManager.canFreeRoulette();
    const paidUsed = this.saveManager.getPaidRouletteSpinsToday();
    if (!canFree && paidUsed >= PAID_COSTS.length) return;

    if (canFree) {
      this.saveManager.recordFreeRoulette();
      profileService.recordFreeRoulette().catch((e: unknown) => {
        console.warn('[Roulette] recordFreeRoulette sync failed:', e);
      });
    } else {
      if (!this.saveManager.spendPaidRoulette()) {
        this.showToast('💎 다이아몬드가 부족합니다');
        return;
      }
      profileService.spendPaidRoulette().catch((e: unknown) => {
        console.warn('[Roulette] spendPaidRoulette sync failed:', e);
      });
    }

    this.spinning = true;
    const ri = this.pickRewardIndex();
    this.animateSpin(ri, () => {
      this.applyReward(REWARDS[ri]!);
      this.currencyText.setText(this.currencyStr());
      this.showRewardPopup(REWARDS[ri]!);
    });
  }

  private pickRewardIndex(): number {
    const r = Math.random();
    let acc = 0;
    for (let i = 0; i < REWARDS.length; i++) {
      acc += REWARDS[i]!.probability;
      if (r < acc) return i;
    }
    return REWARDS.length - 1;
  }

  private animateSpin(ri: number, onDone: () => void): void {
    // Rotate clockwise until slot ri's center aligns with the top pointer (-PI/2)
    const slotMid = -Math.PI / 2 + ri * SLICE + SLICE / 2;
    const cur = this.wheelContainer.rotation;
    let delta = -Math.PI / 2 - slotMid - cur;
    while (delta < 0) delta += Math.PI * 2;
    delta += (5 + Math.floor(Math.random() * 4)) * Math.PI * 2;

    this.tweens.add({
      targets: this.wheelContainer,
      rotation: cur + delta,
      duration: 3200 + Math.random() * 800,
      ease: 'Cubic.easeOut',
      onComplete: () => onDone(),
    });
  }

  private applyReward(r: RewardSlot): void {
    // 로컬 즉시 반영
    if (r.type === 'coins')    this.saveManager.addCoins(r.value);
    if (r.type === 'diamonds') this.saveManager.addDiamonds(r.value);
    if (r.type === 'shield')   this.saveManager.addShieldItem(r.value);
    if (r.type === 'magnet')   this.saveManager.addMagnetItem(r.value);

    // Supabase 백그라운드 동기화 (실패해도 게임 진행에 영향 없음)
    this.syncRewardToSupabase(r).catch((e: unknown) => {
      console.warn('[Roulette] Supabase sync failed:', e);
    });
  }

  private async syncRewardToSupabase(r: RewardSlot): Promise<void> {
    if (r.type === 'coins')    await profileService.addCoins(r.value);
    if (r.type === 'diamonds') await profileService.addDiamonds(r.value);
    if (r.type === 'shield' || r.type === 'magnet') {
      await inventoryService.addItem(r.type as ItemType, r.value);
    }
  }

  // ── Reward popup ──────────────────────────────────────────────

  private showRewardPopup(reward: RewardSlot): void {
    const cy = BASE_HEIGHT / 2;
    const pw = 640;
    const ph = 440;
    const d = DEPTH.POPUP;
    const popup = this.add.container(0, 0).setDepth(d).setScrollFactor(0);

    popup.add(
      this.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, 0x000000, 0.65).setOrigin(0, 0),
    );

    const bg = this.add.graphics();
    bg.fillStyle(0x0d1a33, 1);
    bg.fillRoundedRect(CX - pw / 2, cy - ph / 2, pw, ph, 30);
    bg.lineStyle(5, 0xffdd00, 1);
    bg.strokeRoundedRect(CX - pw / 2, cy - ph / 2, pw, ph, 30);
    popup.add(bg);

    popup.add(this.add.text(CX, cy - 130, '🎉 당첨!', {
      fontSize: '72px', fontStyle: 'bold',
      color: '#ffdd00', stroke: '#996600', strokeThickness: 5,
    }).setOrigin(0.5));

    popup.add(this.add.text(CX, cy - 10, reward.popupLabel + ' 획득!', {
      fontSize: '46px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5));

    const bw = 280;
    const bh = 88;
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x1a9944, 1);
    btnBg.fillRoundedRect(CX - bw / 2, cy + 120, bw, bh, 22);
    btnBg.lineStyle(3, 0xffffff, 0.7);
    btnBg.strokeRoundedRect(CX - bw / 2, cy + 120, bw, bh, 22);
    popup.add(btnBg);

    popup.add(this.add.text(CX, cy + 120 + bh / 2, '확인!', {
      fontSize: '46px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5));

    const zone = this.add
      .zone(CX, cy + 120 + bh / 2, bw, bh)
      .setInteractive({ useHandCursor: true });
    popup.add(zone);

    zone.on('pointerover', () => btnBg.setAlpha(0.8));
    zone.on('pointerout',  () => btnBg.setAlpha(1.0));
    zone.on('pointerdown', () => {
      popup.destroy(true);
      this.refreshSpinUI();
      this.spinning = false;
    });
  }

  // ── [TEST] Reset button ───────────────────────────────────────

  private buildResetButton(depth: number): void {
    const y = BTN_Y + 310;
    const w = 380;
    const h = 76;

    // 테두리만 있는 비강조 스타일
    const bg = this.add.graphics().setDepth(depth).setScrollFactor(0);
    bg.lineStyle(2, 0xff6644, 0.7);
    bg.strokeRoundedRect(CX - w / 2, y - h / 2, w, h, 16);
    bg.fillStyle(0xff6644, 0.12);
    bg.fillRoundedRect(CX - w / 2, y - h / 2, w, h, 16);

    this.add.text(CX, y, '[TEST] 무료 룰렛 초기화', {
      fontSize: '28px',
      color: '#ff9977',
    }).setOrigin(0.5).setDepth(depth + 1).setScrollFactor(0);

    const hit = this.add
      .zone(CX, y, w, h)
      .setDepth(depth + 2).setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    hit.on('pointerover', () => bg.setAlpha(0.6));
    hit.on('pointerout',  () => bg.setAlpha(1.0));
    hit.on('pointerdown', () => this.handleReset());
  }

  private handleReset(): void {
    if (this.spinning) return;

    // 로컬 즉시 초기화
    this.saveManager.resetRouletteState();
    this.refreshSpinUI();

    // Supabase 초기화 (백그라운드)
    profileService.resetRouletteState().catch((e: unknown) => {
      console.warn('[Roulette] resetRouletteState sync failed:', e);
    });

    this.showToast('룰렛 초기화 완료!');
  }

  // ── Toast ─────────────────────────────────────────────────────

  private showToast(msg: string): void {
    const t = this.add.text(CX, BASE_HEIGHT / 2, msg, {
      fontSize: '36px', color: '#ffddaa',
      backgroundColor: '#000000bb', padding: { x: 20, y: 12 },
    }).setOrigin(0.5).setDepth(DEPTH.POPUP + 10).setScrollFactor(0);

    this.tweens.add({
      targets: t, alpha: 0, y: t.y - 80,
      duration: 1800, ease: 'Quad.easeIn',
      onComplete: () => t.destroy(),
    });
  }

  // ── Close ─────────────────────────────────────────────────────

  private closeScene(): void {
    this.scene.stop();
    this.scene.resume(this.fromScene);
  }

  shutdown(): void { /* 정리 필요 시 여기에 추가 */ }
}
