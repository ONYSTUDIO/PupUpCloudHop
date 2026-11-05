import Phaser from 'phaser';
import { BASE_WIDTH, BASE_HEIGHT } from '@config/baseDimensions';
import { DEPTH, UPGRADE_CONFIG } from '@config/constants';
import type { SaveManager } from '@managers/SaveManager';

// ─── 레이아웃 상수 ─────────────────────────────────────────────
const CX = BASE_WIDTH / 2;

const PANEL_W = 960;
const PANEL_H = 1360;
const PANEL_T = BASE_HEIGHT / 2 - PANEL_H / 2;
const PANEL_B = PANEL_T + PANEL_H;

const CARD_W  = PANEL_W - 60;
const CARD_H  = 300;
const CARD_GAP_Y = 24;
const CARD_L  = CX - CARD_W / 2;
const CARDS_TOP = PANEL_T + 220;

// ─── UpgradeDef 타입 ───────────────────────────────────────────
interface UpgradeDef {
  type: 'rocket' | 'itemRate' | 'shield';
  icon: string;
  name: string;
  level: number;
  maxLevel: number;
  effectDesc: (lv: number) => string;
  unlockMet: boolean;
  unlockDesc: string;
}

// 카드 하단 버튼 레이아웃
const BTN_H         = 56;
const BTN_UPGRADE_W = 220;
const BTN_SHOP_W    = 180;
const BTN_GAP       = 12;

export class UpgradePopup {
  private objs: Phaser.GameObjects.GameObject[] = [];
  private destroyed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly saveManager: SaveManager,
    private readonly onClose: () => void,
    private readonly onGoShop: () => void = () => { /* noop */ },
  ) {}

  // ─── 공개 메서드 ──────────────────────────────────────────────

  open(): void {
    this.build();
  }

  close(): void {
    this.destroy();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const o of this.objs) o.destroy();
    this.objs = [];
    this.onClose();
  }

  // ─── 팝업 빌드 ────────────────────────────────────────────────

  private build(): void {
    const scene = this.scene;

    // ── dim 배경 ────────────────────────────────────────────────
    this.reg(
      scene.add
        .rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, 0x000020, 0.65)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(DEPTH.POPUP)
        .setInteractive(),   // 아래 UI 클릭 차단
    );

    // ── 패널 ────────────────────────────────────────────────────
    this.reg(
      scene.add
        .rectangle(CX, BASE_HEIGHT / 2, PANEL_W, PANEL_H, 0x0a1628, 0.97)
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.POPUP)
        .setStrokeStyle(3, 0x3366aa),
    );

    // ── 타이틀 ──────────────────────────────────────────────────
    this.reg(
      scene.add
        .text(CX, PANEL_T + 60, '업그레이드', {
          fontSize: '68px',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#001133',
          strokeThickness: 5,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.POPUP),
    );

    // ── 재화 잔액 표시 ──────────────────────────────────────────
    this.buildCurrencyRow();

    // ── 업그레이드 카드 3종 ─────────────────────────────────────
    this.buildCards();

    // ── 닫기 버튼 ───────────────────────────────────────────────
    this.reg(
      scene.add
        .text(CX, PANEL_B - 60, '닫기', {
          fontSize: '54px',
          fontStyle: 'bold',
          color: '#ffffff',
          backgroundColor: '#2a4a66',
          padding: { x: 80, y: 20 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.POPUP)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', function (this: Phaser.GameObjects.Text) { this.setAlpha(0.85); })
        .on('pointerout',  function (this: Phaser.GameObjects.Text) { this.setAlpha(1); })
        .on('pointerdown', () => {
          if (this.destroyed) return;
          this.destroy();
        }),
    );
  }

  // ─── 재화 잔액 행 ─────────────────────────────────────────────

  private buildCurrencyRow(): void {
    const scene = this.scene;
    const rowY  = PANEL_T + 148;
    const badgeH = 60;

    // 코인 뱃지
    const coinBadgeW = 220;
    const coinBadgeX = CX - coinBadgeW - 12;
    const coinBg = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.POPUP);
    coinBg.fillStyle(0x1e1800, 0.95);
    coinBg.fillRoundedRect(coinBadgeX, rowY - badgeH / 2, coinBadgeW, badgeH, 30);
    coinBg.lineStyle(2, 0xffd700, 0.9);
    coinBg.strokeRoundedRect(coinBadgeX, rowY - badgeH / 2, coinBadgeW, badgeH, 30);
    this.reg(coinBg);

    this.reg(
      scene.add
        .text(coinBadgeX + 16, rowY, '🪙', { fontSize: '36px' })
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.POPUP),
    );
    this.reg(
      scene.add
        .text(coinBadgeX + 58, rowY, this.saveManager.getCoins().toLocaleString(), {
          fontSize: '34px', fontStyle: 'bold', color: '#ffd700',
        })
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.POPUP),
    );

    // 조각 뱃지
    const fragBadgeW = 200;
    const fragBadgeX = CX + 12;
    const fragBg = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.POPUP);
    fragBg.fillStyle(0x1a0a2e, 0.95);
    fragBg.fillRoundedRect(fragBadgeX, rowY - badgeH / 2, fragBadgeW, badgeH, 30);
    fragBg.lineStyle(2, 0xab47bc, 0.9);
    fragBg.strokeRoundedRect(fragBadgeX, rowY - badgeH / 2, fragBadgeW, badgeH, 30);
    this.reg(fragBg);

    this.reg(
      scene.add
        .text(fragBadgeX + 14, rowY, '🧩', { fontSize: '36px' })
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.POPUP),
    );
    this.reg(
      scene.add
        .text(fragBadgeX + 56, rowY, this.saveManager.getFragments().toLocaleString(), {
          fontSize: '34px', fontStyle: 'bold', color: '#ce93d8',
        })
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.POPUP),
    );
  }

  // ─── 카드 목록 빌드 ──────────────────────────────────────────

  private buildCards(): void {
    const upgrades   = this.saveManager.getUpgrades();
    const totalJumps = this.saveManager.getTotalJumps();
    const bestScore  = this.saveManager.getBestScore();

    const defs: UpgradeDef[] = [
      {
        type: 'rocket',
        icon: '⭐',
        name: '로켓 지속시간',
        level:    upgrades.rocketLevel,
        maxLevel: UPGRADE_CONFIG.ROCKET.MAX_LEVEL,
        effectDesc: (lv: number): string => {
          const cur = UPGRADE_CONFIG.ROCKET.DURATION_BY_LEVEL[lv] ?? 3;
          const nxt = UPGRADE_CONFIG.ROCKET.DURATION_BY_LEVEL[lv + 1];
          return nxt !== undefined ? `${cur}초 → ${nxt}초` : `${cur}초 (최대)`;
        },
        unlockMet:  true,
        unlockDesc: '',
      },
      {
        type: 'itemRate',
        icon: '✨',
        name: '아이템 등장률',
        level:    upgrades.itemRateLevel,
        maxLevel: UPGRADE_CONFIG.ITEM_RATE.MAX_LEVEL,
        effectDesc: (lv: number): string => {
          const nxt = UPGRADE_CONFIG.ITEM_RATE.REDUCTION_BY_LEVEL[lv + 1];
          return nxt !== undefined
            ? `픽업 간격 −${Math.round(nxt * 100)}%`
            : '픽업 간격 −20% (최대)';
        },
        unlockMet:  totalJumps >= 100,
        unlockDesc: `점프 100회 필요 (현재 ${totalJumps}회)`,
      },
      {
        type: 'shield',
        icon: '🫧',
        name: '시작 방어막',
        level:    upgrades.shieldLevel,
        maxLevel: UPGRADE_CONFIG.SHIELD.MAX_LEVEL,
        effectDesc: (_lv: number): string => '판 시작 시 방어막 1개',
        unlockMet:  bestScore >= 60,
        unlockDesc: `최고 점수 60점 필요 (현재 ${bestScore}점)`,
      },
    ];

    defs.forEach((def, i) => {
      const cardY = CARDS_TOP + i * (CARD_H + CARD_GAP_Y);
      this.makeCard(cardY, def);
    });
  }

  // ─── 개별 카드 ───────────────────────────────────────────────

  private makeCard(cardY: number, def: UpgradeDef): void {
    const scene   = this.scene;
    const isMax   = def.level >= def.maxLevel;
    const bgColor = isMax ? 0x1a4a2a : 0x0f3460;
    const borderColor = isMax ? 0x4caf50 : 0x4fc3f7;

    // 카드 배경
    const bg = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.POPUP);
    bg.fillStyle(bgColor, 1);
    bg.fillRoundedRect(CARD_L, cardY, CARD_W, CARD_H, 20);
    bg.lineStyle(2, borderColor, 1);
    bg.strokeRoundedRect(CARD_L, cardY, CARD_W, CARD_H, 20);
    this.reg(bg);

    // 아이콘
    this.reg(
      scene.add
        .text(CARD_L + 72, cardY + CARD_H / 2 - 40, def.icon, { fontSize: '72px' })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.POPUP),
    );

    // 이름
    this.reg(
      scene.add
        .text(CARD_L + 130, cardY + 44, def.name, {
          fontSize: '38px', fontStyle: 'bold', color: '#ffffff',
        })
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.POPUP),
    );

    // 단계 표시
    const levelLabel = isMax ? 'MAX' : `Lv.${def.level} / ${def.maxLevel}`;
    const levelColor = isMax ? '#4caf50' : '#4fc3f7';
    this.reg(
      scene.add
        .text(CARD_L + CARD_W - 24, cardY + 44, levelLabel, {
          fontSize: '34px', fontStyle: 'bold', color: levelColor,
        })
        .setOrigin(1, 0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.POPUP),
    );

    // 효과 설명
    this.reg(
      scene.add
        .text(CARD_L + 130, cardY + 108, def.effectDesc(def.level), {
          fontSize: '28px', color: '#aaaacc',
        })
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.POPUP),
    );

    // 하단 영역
    const bottomY = cardY + CARD_H - 62;

    if (isMax) {
      this.makeMaxBadge(bottomY);
      return;
    }

    if (!def.unlockMet) {
      // 잠금 설명 텍스트
      this.reg(
        scene.add
          .text(CARD_L + 130, bottomY, `🔒 ${def.unlockDesc}`, {
            fontSize: '26px', color: '#888888',
            wordWrap: { width: CARD_W - BTN_SHOP_W - BTN_GAP - 160 },
          })
          .setOrigin(0, 0.5)
          .setScrollFactor(0)
          .setDepth(DEPTH.POPUP),
      );
      // 잠금 상태에서도 구매 버튼(상점 이동)은 항상 표시
      this.makeShopBtn(bottomY);
      return;
    }

    // 비용 + 버튼 2종
    const costArr = (
      def.type === 'rocket'
        ? UPGRADE_CONFIG.ROCKET.COSTS
        : def.type === 'itemRate'
          ? UPGRADE_CONFIG.ITEM_RATE.COSTS
          : UPGRADE_CONFIG.SHIELD.COSTS
    );
    const cost = costArr[def.level];
    if (!cost) return;

    const coins     = this.saveManager.getCoins();
    const frags     = this.saveManager.getFragments();
    const canAfford = coins >= cost.coins && frags >= cost.fragments;
    const costLabel = `🪙${cost.coins.toLocaleString()} + 🧩${cost.fragments}`;

    this.reg(
      scene.add
        .text(CARD_L + 130, bottomY, costLabel, {
          fontSize: '28px', color: canAfford ? '#ffd700' : '#888888',
        })
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.POPUP),
    );

    this.makeShopBtn(bottomY);
    this.makeUpgradeBtn(bottomY, def, canAfford);
  }

  // ─── MAX 뱃지 ─────────────────────────────────────────────────

  private makeMaxBadge(centerY: number): void {
    const scene  = this.scene;
    const badgeW = 400;
    const badgeH = 56;
    const badgeX = CX - badgeW / 2;

    const badgeBg = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.POPUP);
    badgeBg.fillStyle(0x4caf50, 1);
    badgeBg.fillRoundedRect(badgeX, centerY - badgeH / 2, badgeW, badgeH, 28);
    this.reg(badgeBg);

    this.reg(
      scene.add
        .text(CX, centerY, '업그레이드 완성', {
          fontSize: '30px', fontStyle: 'bold', color: '#0d1a0d',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.POPUP),
    );
  }

  // ─── 업그레이드 버튼 (우측) ──────────────────────────────────

  private makeUpgradeBtn(
    centerY: number,
    def: UpgradeDef,
    canAfford: boolean,
  ): void {
    const scene = this.scene;
    const btnX  = CARD_L + CARD_W - 24 - BTN_UPGRADE_W;
    const fill  = canAfford ? 0x4fc3f7 : 0x444466;
    const alpha = canAfford ? 1 : 0.4;

    const btnBg = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.POPUP);
    const drawBtn = (a: number): void => {
      btnBg.clear();
      btnBg.fillStyle(fill, a);
      btnBg.fillRoundedRect(btnX, centerY - BTN_H / 2, BTN_UPGRADE_W, BTN_H, 28);
    };
    drawBtn(alpha);
    this.reg(btnBg);

    this.reg(
      scene.add
        .text(btnX + BTN_UPGRADE_W / 2, centerY, '업그레이드', {
          fontSize: '28px', fontStyle: 'bold',
          color: canAfford ? '#0d0d1a' : '#666688',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.POPUP)
        .setAlpha(alpha),
    );

    if (!canAfford) return;

    const hit = scene.add
      .rectangle(btnX + BTN_UPGRADE_W / 2, centerY, BTN_UPGRADE_W, BTN_H, 0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.POPUP)
      .setInteractive({ useHandCursor: true });
    this.reg(hit);

    hit.on('pointerover',  () => drawBtn(0.7));
    hit.on('pointerout',   () => drawBtn(1));
    hit.on('pointerdown',  () => {
      if (this.destroyed) return;
      const ok = this.saveManager.purchaseUpgrade(def.type);
      if (ok) {
        this.refreshCards();
      }
    });
  }

  // ─── 구매(상점 이동) 버튼 (업그레이드 버튼 왼쪽) ─────────────

  private makeShopBtn(centerY: number): void {
    const scene = this.scene;
    const btnX  = CARD_L + CARD_W - 24 - BTN_UPGRADE_W - BTN_GAP - BTN_SHOP_W;

    const btnBg = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.POPUP);
    const drawBtn = (alpha: number): void => {
      btnBg.clear();
      btnBg.fillStyle(0x2a4a66, alpha);
      btnBg.fillRoundedRect(btnX, centerY - BTN_H / 2, BTN_SHOP_W, BTN_H, 28);
      btnBg.lineStyle(2, 0x4fc3f7, 0.6);
      btnBg.strokeRoundedRect(btnX, centerY - BTN_H / 2, BTN_SHOP_W, BTN_H, 28);
    };
    drawBtn(1);
    this.reg(btnBg);

    this.reg(
      scene.add
        .text(btnX + BTN_SHOP_W / 2, centerY, '구매', {
          fontSize: '28px', fontStyle: 'bold', color: '#ffffff',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.POPUP),
    );

    const hit = scene.add
      .rectangle(btnX + BTN_SHOP_W / 2, centerY, BTN_SHOP_W, BTN_H, 0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.POPUP)
      .setInteractive({ useHandCursor: true });
    this.reg(hit);

    hit.on('pointerover',  () => drawBtn(0.7));
    hit.on('pointerout',   () => drawBtn(1));
    hit.on('pointerdown',  () => {
      if (this.destroyed) return;
      this.destroy();
      this.onGoShop();
    });
  }

  // ─── 카드 전체 리프레시 ──────────────────────────────────────

  private refreshCards(): void {
    if (this.destroyed) return;
    // 팝업 오브젝트를 모두 제거 후 재생성 (destroyed 플래그는 유지)
    for (const o of this.objs) o.destroy();
    this.objs = [];
    this.destroyed = false;
    this.build();
  }

  // ─── 헬퍼 ────────────────────────────────────────────────────

  private reg(obj: Phaser.GameObjects.GameObject): Phaser.GameObjects.GameObject {
    this.objs.push(obj);
    return obj;
  }
}
