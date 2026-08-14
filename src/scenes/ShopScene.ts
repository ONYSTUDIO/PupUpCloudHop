import Phaser from 'phaser';
import { SCENE_KEYS } from '@config/constants';
import { BASE_WIDTH, BASE_HEIGHT } from '@config/gameConfig';
import { SaveManager } from '@managers/SaveManager';

// ─── 상수 ──────────────────────────────────────────────────────
const C = {
  BG:         0x1a1a2e,
  PANEL:      0x16213e,
  CARD:       0x0f3460,
  CARD_OWNED: 0x1a4a2a,
  CARD_IAP:   0x3d1a4a,
  ACCENT:     0x4fc3f7,
  GOLD:       0xffd700,
  GREEN:      0x4caf50,
  PURPLE:     0xab47bc,
  WHITE:      0xffffff,
  TAB_ACTIVE: 0x4fc3f7,
  TAB_IDLE:   0x0f3460,
} as const;

const HEADER_H   = 180;
const TABBAR_H   = 110;
const CONTENT_Y  = HEADER_H + TABBAR_H;
const CARD_W     = 470;
const CARD_H     = 220;
const CARD_GAP_X = 30;
const CARD_GAP_Y = 24;
const CARD_PAD_X = 55;  // content 영역 좌측 여백

type TabKey = 'skin' | 'passive' | 'booster' | 'upgrade' | 'coin';

interface TabDef { key: TabKey; label: string }
const TABS: TabDef[] = [
  { key: 'skin',    label: '스킨'   },
  { key: 'passive', label: '패시브' },
  { key: 'booster', label: '부스터' },
  { key: 'upgrade', label: '업그레이드' },
  { key: 'coin',    label: '코인'   },
];

// ─── 아이템 데이터 ──────────────────────────────────────────────

interface ShopItem {
  id: string;
  name: string;
  desc: string;
  icon: string;
  price: number | string;
  currency: 'free' | 'coin' | 'iap';
}

const SKIN_ITEMS: ShopItem[] = [
  { id: 'dog_default',   name: '갈색 강아지',    desc: '기본 캐릭터',         icon: '🐶', price: 0,      currency: 'free' },
  { id: 'golden',        name: '골든 리트리버',   desc: '황금빛 털을 가진 친구', icon: '🐕', price: 500,   currency: 'coin' },
  { id: 'dalmatian',     name: '달마시안',        desc: '점박이 패션 리더',     icon: '🐾', price: 800,   currency: 'coin' },
  { id: 'border_collie', name: '흑백 보더콜리',   desc: '영리한 눈빛',          icon: '🐩', price: 800,   currency: 'coin' },
  { id: 'corgi',         name: '웰시코기',        desc: '짧은 다리의 귀요미',   icon: '🦮', price: 1200,  currency: 'coin' },
  { id: 'cat',           name: '고양이',          desc: '어쩌다 구름에 오른 고양이', icon: '🐱', price: 1500, currency: 'coin' },
  { id: 'space_dog',     name: '우주복 강아지 🚀', desc: '별을 향해 출발!',      icon: '🚀', price: '$1.99', currency: 'iap' },
  { id: 'angel_dog',     name: '천사 강아지 👼',  desc: '하늘에서 내려온 강아지', icon: '👼', price: '$1.99', currency: 'iap' },
  { id: 'wizard_dog',    name: '마법사 강아지 🧙', desc: '마법으로 구름을 타다',  icon: '🧙', price: '$2.99', currency: 'iap' },
];

const PASSIVE_ITEMS: ShopItem[] = [
  { id: 'shield',      name: '🫧 방어막',    desc: '번개 충돌 1회 무효 · 비눗방울 비주얼', icon: '🫧', price: 0,    currency: 'free' },
  { id: 'double_jump', name: '🦅 더블 점프', desc: '공중에서 1회 추가 점프 가능',            icon: '🦅', price: 800,  currency: 'coin' },
  { id: 'cloud_summon',name: '💫 구름 소환', desc: '쿨타임마다 발 아래 임시 구름 소환',      icon: '💫', price: 1200, currency: 'coin' },
];

const BOOSTER_ITEMS: ShopItem[] = [
  { id: 'boost_shield',  name: '⚡ 초기 부스터',   desc: '시작 시 방어막 1개 추가',      icon: '⚡', price: 30, currency: 'coin' },
  { id: 'boost_guard',   name: '🛡️ 장애물 방패',   desc: '첫 장애물 피해 자동 무효 1회', icon: '🛡️', price: 40, currency: 'coin' },
  { id: 'boost_score2x', name: '🌟 점수 2배',       desc: '1게임 점수 ×2 (최고점 제외)',  icon: '🌟', price: 50, currency: 'coin' },
  { id: 'boost_magnet',  name: '🧲 자석 효과',      desc: '착지 판정 범위 일시 확대',     icon: '🧲', price: 40, currency: 'coin' },
  { id: 'boost_slow',    name: '⏱️ 타임 슬로우',    desc: '3초간 게임 절반 속도',         icon: '⏱️', price: 60, currency: 'coin' },
  { id: 'boost_freeze',  name: '🧊 구름 동결',      desc: '4초간 모든 구름 정지',         icon: '🧊', price: 50, currency: 'coin' },
  { id: 'boost_trumpet', name: '🎺 새떼 퇴치 나팔', desc: '현재 새떼 소멸 + 스폰 억제',   icon: '🎺', price: 45, currency: 'coin' },
];

const UPGRADE_ITEMS: ShopItem[] = [
  { id: 'shield_up',   name: '🫧 방어막 강화',      desc: '방어 횟수 +1 (최대 2회)',           icon: '🫧', price: 1000, currency: 'coin' },
  { id: 'rocket_up',   name: '🚀 로켓 시간 연장',    desc: '로켓 지속 +1초 (3초→4초)',          icon: '🚀', price: 800,  currency: 'coin' },
  { id: 'star_rate_1', name: '⭐ 별 등장률 증가 Lv1', desc: '별 스폰 주기 단축',               icon: '⭐', price: 600,  currency: 'coin' },
  { id: 'star_rate_2', name: '⭐ 별 등장률 증가 Lv2', desc: '추가 단축 (Lv1 이후)',             icon: '⭐', price: 1200, currency: 'coin' },
];

const COIN_ITEMS: ShopItem[] = [
  { id: 'coin_s',    name: '코인 소',      desc: '코인 300개',              icon: '🪙', price: '$0.99', currency: 'iap' },
  { id: 'coin_m',    name: '코인 중',      desc: '코인 800개 (+60 보너스)', icon: '🪙', price: '$1.99', currency: 'iap' },
  { id: 'coin_l',    name: '코인 대',      desc: '코인 2,000개 (+300 보너스)', icon: '🪙', price: '$4.99', currency: 'iap' },
  { id: 'no_ads',    name: '광고 제거',    desc: '영구 광고 없음',          icon: '🚫', price: '$2.99', currency: 'iap' },
  { id: 'starter',   name: '🔥 스타터 팩', desc: '우주복 강아지 + 코인 200 + 광고 제거 · 신규 1회', icon: '🎁', price: '$2.99', currency: 'iap' },
];

const TAB_ITEMS: Record<TabKey, ShopItem[]> = {
  skin:    SKIN_ITEMS,
  passive: PASSIVE_ITEMS,
  booster: BOOSTER_ITEMS,
  upgrade: UPGRADE_ITEMS,
  coin:    COIN_ITEMS,
};

// ─── ShopScene ─────────────────────────────────────────────────

interface ShopSceneData {
  from?: string;
}

export class ShopScene extends Phaser.Scene {
  private saveManager!: SaveManager;
  private fromScene: string = SCENE_KEYS.TITLE;

  private activeTab: TabKey = 'skin';
  private tabBgs: Partial<Record<TabKey, Phaser.GameObjects.Graphics>> = {};
  private tabLabels: Partial<Record<TabKey, Phaser.GameObjects.Text>> = {};
  private contentContainer!: Phaser.GameObjects.Container;
  private coinText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENE_KEYS.SHOP });
  }

  init(data: ShopSceneData): void {
    this.fromScene = data?.from ?? SCENE_KEYS.TITLE;
  }

  create(): void {
    this.saveManager = new SaveManager();
    this.drawBg();
    this.drawHeader();
    this.drawTabBar();
    this.contentContainer = this.add.container(0, CONTENT_Y);
    this.renderTab(this.activeTab);
  }

  shutdown(): void {
    this.contentContainer?.destroy();
  }

  // ─── 배경 ────────────────────────────────────────────────────

  private drawBg(): void {
    const g = this.add.graphics();
    g.fillGradientStyle(0x0d0d1a, 0x0d0d1a, 0x1a1a3e, 0x1a1a3e, 1);
    g.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
  }

  // ─── 헤더 ────────────────────────────────────────────────────

  private drawHeader(): void {
    // 헤더 배경
    const bg = this.add.graphics();
    bg.fillStyle(C.PANEL, 1);
    bg.fillRect(0, 0, BASE_WIDTH, HEADER_H);
    bg.lineStyle(2, C.ACCENT, 0.4);
    bg.lineBetween(0, HEADER_H, BASE_WIDTH, HEADER_H);

    // 타이틀
    this.add.text(BASE_WIDTH / 2, HEADER_H / 2, '상점', {
      fontSize: '72px',
      fontStyle: 'bold',
      color: '#4fc3f7',
    }).setOrigin(0.5);

    // 코인 표시
    const coins = this.saveManager.getCoins();
    const coinBg = this.add.graphics();
    coinBg.fillStyle(0x1a2a1a, 0.9);
    coinBg.fillRoundedRect(BASE_WIDTH - 340, HEADER_H / 2 - 40, 300, 80, 40);
    coinBg.lineStyle(2, C.GOLD, 0.8);
    coinBg.strokeRoundedRect(BASE_WIDTH - 340, HEADER_H / 2 - 40, 300, 80, 40);

    this.add.text(BASE_WIDTH - 310, HEADER_H / 2, '🪙', {
      fontSize: '52px',
    }).setOrigin(0, 0.5);

    this.coinText = this.add.text(BASE_WIDTH - 252, HEADER_H / 2, coins.toLocaleString(), {
      fontSize: '46px',
      fontStyle: 'bold',
      color: '#ffd700',
    }).setOrigin(0, 0.5);

    // 닫기 버튼
    this.makeCloseButton();
  }

  private makeCloseButton(): void {
    const size = 90;
    const x = 70;
    const y = HEADER_H / 2;

    const hitArea = this.add.rectangle(x, y, size, size, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    const g = this.add.graphics();
    const drawBtn = (alpha: number) => {
      g.clear();
      g.fillStyle(0x334466, alpha);
      g.fillCircle(x, y, size / 2);
      g.lineStyle(5, C.ACCENT, 1);
      const d = 18;
      g.lineBetween(x - d, y - d, x + d, y + d);
      g.lineBetween(x + d, y - d, x - d, y + d);
    };
    drawBtn(0.7);

    hitArea.on('pointerover',  () => drawBtn(1));
    hitArea.on('pointerout',   () => drawBtn(0.7));
    hitArea.on('pointerdown',  () => this.closeShop());
  }

  private closeShop(): void {
    this.scene.stop();
    this.scene.resume(this.fromScene);
  }

  // ─── 탭 바 ────────────────────────────────────────────────────

  private drawTabBar(): void {
    const tabW = BASE_WIDTH / TABS.length;
    const barBg = this.add.graphics();
    barBg.fillStyle(C.PANEL, 1);
    barBg.fillRect(0, HEADER_H, BASE_WIDTH, TABBAR_H);

    TABS.forEach((tab, i) => {
      const x = i * tabW;

      const bg = this.add.graphics();
      this.tabBgs[tab.key] = bg;

      const label = this.add.text(x + tabW / 2, HEADER_H + TABBAR_H / 2, tab.label, {
        fontSize: '34px',
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0.5);
      this.tabLabels[tab.key] = label;

      const hitArea = this.add.rectangle(x + tabW / 2, HEADER_H + TABBAR_H / 2, tabW, TABBAR_H, 0, 0)
        .setInteractive({ useHandCursor: true });

      hitArea.on('pointerdown', () => this.switchTab(tab.key));
    });

    // 초기 탭 하이라이트
    this.updateTabHighlight();
  }

  private switchTab(key: TabKey): void {
    if (this.activeTab === key) return;
    this.activeTab = key;
    this.updateTabHighlight();
    this.contentContainer.removeAll(true);
    this.renderTab(key);
  }

  private updateTabHighlight(): void {
    const tabW = BASE_WIDTH / TABS.length;
    TABS.forEach((tab, i) => {
      const isActive = tab.key === this.activeTab;
      const bg = this.tabBgs[tab.key];
      const label = this.tabLabels[tab.key];
      if (!bg || !label) return;

      bg.clear();
      if (isActive) {
        bg.fillStyle(C.TAB_ACTIVE, 0.2);
        bg.fillRect(i * tabW, HEADER_H, tabW, TABBAR_H);
        bg.lineStyle(3, C.ACCENT, 1);
        bg.lineBetween(i * tabW + 8, HEADER_H + TABBAR_H - 3, (i + 1) * tabW - 8, HEADER_H + TABBAR_H - 3);
        label.setColor('#4fc3f7');
      } else {
        label.setColor('#aaaacc');
      }
    });
  }

  // ─── 탭 콘텐츠 ────────────────────────────────────────────────

  private renderTab(key: TabKey): void {
    const items = TAB_ITEMS[key];
    const ownedSkins = this.saveManager.getOwnedSkins();
    const equippedSkin = this.saveManager.getEquippedSkin();

    items.forEach((item, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = CARD_PAD_X + col * (CARD_W + CARD_GAP_X);
      const y = CARD_GAP_Y + row * (CARD_H + CARD_GAP_Y);

      let status: 'equipped' | 'owned' | 'locked';
      if (key === 'skin') {
        if (item.id === equippedSkin)               status = 'equipped';
        else if (ownedSkins.includes(item.id))      status = 'owned';
        else                                         status = 'locked';
      } else if (item.currency === 'free') {
        status = 'owned';
      } else {
        status = 'locked';
      }

      this.makeCard(x, y, item, status, key);
    });
  }

  private makeCard(
    x: number, y: number,
    item: ShopItem,
    status: 'equipped' | 'owned' | 'locked',
    tab: TabKey,
  ): void {
    const isIAP = item.currency === 'iap';
    const bgColor = status === 'owned' || status === 'equipped'
      ? C.CARD_OWNED
      : isIAP ? C.CARD_IAP : C.CARD;

    const g = this.add.graphics();
    g.fillStyle(bgColor, 1);
    g.fillRoundedRect(x, y, CARD_W, CARD_H, 16);
    g.lineStyle(2, status === 'equipped' ? C.ACCENT : isIAP ? C.PURPLE : 0x334466, 1);
    g.strokeRoundedRect(x, y, CARD_W, CARD_H, 16);
    this.contentContainer.add(g);

    // 아이콘
    const iconText = this.add.text(x + 64, y + CARD_H / 2, item.icon, {
      fontSize: '72px',
    }).setOrigin(0.5);
    this.contentContainer.add(iconText);

    // 이름
    const nameText = this.add.text(x + 120, y + 36, item.name, {
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#ffffff',
      wordWrap: { width: CARD_W - 130 },
    }).setOrigin(0, 0.5);
    this.contentContainer.add(nameText);

    // 설명
    const descText = this.add.text(x + 120, y + 90, item.desc, {
      fontSize: '26px',
      color: '#aaaacc',
      wordWrap: { width: CARD_W - 130 },
    }).setOrigin(0, 0.5);
    this.contentContainer.add(descText);

    // 가격 / 상태 뱃지
    this.makeCardBadge(x, y, item, status, tab);
  }

  private makeCardBadge(
    x: number, y: number,
    item: ShopItem,
    status: 'equipped' | 'owned' | 'locked',
    tab: TabKey,
  ): void {
    const badgeY = y + CARD_H - 56;
    const badgeX = x + 118;
    const badgeW = CARD_W - 130;

    if (status === 'equipped') {
      this.makeBadge(badgeX, badgeY, badgeW, '장착 중', C.ACCENT, '#0d0d1a');
    } else if (status === 'owned') {
      if (tab === 'skin') {
        this.makeBadgeInteractive(badgeX, badgeY, badgeW, '장착하기', C.GREEN, '#ffffff', () => {
          this.saveManager.equipSkin(item.id);
          this.contentContainer.removeAll(true);
          this.renderTab(tab);
        });
      } else {
        this.makeBadge(badgeX, badgeY, badgeW, '보유 중', C.GREEN, '#ffffff');
      }
    } else {
      // 잠금 — 가격 표시
      const label = item.currency === 'coin'
        ? `🪙 ${(item.price as number).toLocaleString()}`
        : `💳 ${item.price}`;
      const color = item.currency === 'coin' ? C.GOLD : C.PURPLE;
      this.makeBadgeInteractive(badgeX, badgeY, badgeW, label, color, '#0d0d1a', () => {
        this.handlePurchase(item, tab);
      });
    }
  }

  private makeBadge(x: number, y: number, w: number, label: string, fillColor: number, textColor: string): void {
    const h = 52;
    const g = this.add.graphics();
    g.fillStyle(fillColor, 1);
    g.fillRoundedRect(x, y - h / 2, w, h, 26);
    this.contentContainer.add(g);

    const t = this.add.text(x + w / 2, y, label, {
      fontSize: '28px',
      fontStyle: 'bold',
      color: textColor,
    }).setOrigin(0.5);
    this.contentContainer.add(t);
  }

  private makeBadgeInteractive(
    x: number, y: number, w: number,
    label: string, fillColor: number, textColor: string,
    onPress: () => void,
  ): void {
    const h = 52;
    const g = this.add.graphics();
    const draw = (alpha: number) => {
      g.clear();
      g.fillStyle(fillColor, alpha);
      g.fillRoundedRect(x, y - h / 2, w, h, 26);
    };
    draw(1);
    this.contentContainer.add(g);

    const t = this.add.text(x + w / 2, y, label, {
      fontSize: '28px',
      fontStyle: 'bold',
      color: textColor,
    }).setOrigin(0.5);
    this.contentContainer.add(t);

    const hit = this.add.rectangle(x + w / 2, y, w, h, 0, 0)
      .setInteractive({ useHandCursor: true });
    this.contentContainer.add(hit);

    hit.on('pointerover',  () => draw(0.75));
    hit.on('pointerout',   () => draw(1));
    hit.on('pointerdown',  () => onPress());
  }

  // ─── 구매 처리 ────────────────────────────────────────────────

  private handlePurchase(item: ShopItem, tab: TabKey): void {
    if (item.currency === 'iap') {
      this.showToast('인앱 결제는 준비 중입니다');
      return;
    }
    if (item.currency === 'free') return;

    const price = item.price as number;
    const success = this.saveManager.spendCoins(price);
    if (!success) {
      this.showToast('코인이 부족합니다');
      return;
    }

    if (tab === 'skin') {
      this.saveManager.buySkin(item.id);
    }

    this.coinText.setText(this.saveManager.getCoins().toLocaleString());
    this.contentContainer.removeAll(true);
    this.renderTab(tab);
    this.showToast(`${item.name} 구매 완료!`);
  }

  // ─── 토스트 알림 ──────────────────────────────────────────────

  private showToast(message: string): void {
    const toastY = BASE_HEIGHT - 180;
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.82);
    bg.fillRoundedRect(BASE_WIDTH / 2 - 340, toastY - 42, 680, 84, 42);

    const text = this.add.text(BASE_WIDTH / 2, toastY, message, {
      fontSize: '36px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: [bg, text],
      alpha: { from: 1, to: 0 },
      delay: 1400,
      duration: 400,
      onComplete: () => { bg.destroy(); text.destroy(); },
    });
  }
}
