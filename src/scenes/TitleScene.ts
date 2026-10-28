import Phaser from 'phaser';
import { SCENE_KEYS, DEPTH } from '@config/constants';
import { BASE_WIDTH, BASE_HEIGHT } from '@config/gameConfig';
import { authService } from '../services/AuthService';
import type { User } from '@supabase/supabase-js';

export class TitleScene extends Phaser.Scene {
  private loginContainer!: Phaser.GameObjects.Container;
  private authUnsub: (() => void) | null = null;
  private transitioning: boolean = false;

  constructor() {
    super({ key: SCENE_KEYS.TITLE });
  }

  create(): void {
    this.transitioning = false;
    this.drawBackground();
    this.addTitle();
    this.addLoginSection();
    void this.initAuthState();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.authUnsub?.();
      this.authUnsub = null;
    });
  }

  // ─── 배경 ────────────────────────────────────────────────

  private drawBackground(): void {
    this.add.image(BASE_WIDTH / 2, BASE_HEIGHT / 2, 'bg_login_town')
      .setDisplaySize(BASE_WIDTH, BASE_HEIGHT)
      .setDepth(DEPTH.BACKGROUND);
  }

  // ─── 타이틀 ───────────────────────────────────────────────

  private addTitle(): void {
    const cx = BASE_WIDTH / 2;
    this.add
      .rectangle(cx, BASE_HEIGHT * 0.3, 900, 380, 0x003399, 0.35)
      .setOrigin(0.5)
      .setDepth(DEPTH.HUD - 1);

    this.add
      .text(cx, BASE_HEIGHT * 0.23, '안 떨어질개', {
        fontSize: '110px', fontStyle: 'bold',
        color: '#ffffff', stroke: '#001166', strokeThickness: 10,
      })
      .setOrigin(0.5).setDepth(DEPTH.HUD);

    this.add
      .text(cx, BASE_HEIGHT * 0.35, 'Pup Up!  Cloud Hop', {
        fontSize: '58px', color: '#ffe066',
        stroke: '#001166', strokeThickness: 6,
      })
      .setOrigin(0.5).setDepth(DEPTH.HUD);

    const dogG = this.add.graphics().setDepth(DEPTH.HUD);
    dogG.setPosition(cx, BASE_HEIGHT * 0.52);
    this.drawMiniDog(dogG);
  }

  private drawMiniDog(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0xf0b88a, 1);
    g.fillEllipse(0, 10, 80, 60);
    g.fillEllipse(4, -22, 68, 58);
    g.fillStyle(0xb06a2a, 1);
    g.fillEllipse(-24, -44, 24, 36);
    g.fillEllipse(28, -44, 22, 32);
    g.fillStyle(0x222222, 1);
    g.fillCircle(-12, -26, 7);
    g.fillCircle(16, -26, 7);
    g.fillStyle(0x553311, 1);
    g.fillEllipse(3, -10, 18, 12);
  }

  // ─── 로그인 섹션 ──────────────────────────────────────────

  private addLoginSection(): void {
    this.loginContainer = this.add.container(0, 0).setDepth(DEPTH.HUD);
    this.renderLoggedOut();
  }

  private async initAuthState(): Promise<void> {
    const user = await authService.getUser();
    if (!this.scene.isActive(SCENE_KEYS.TITLE)) return;
    this.renderLoginState(user);

    const { data: { subscription } } = authService.onAuthStateChange((user) => {
      if (!this.scene.isActive(SCENE_KEYS.TITLE)) return;
      this.renderLoginState(user);
    });
    this.authUnsub = () => subscription.unsubscribe();
  }

  private renderLoginState(user: User | null): void {
    if (user) {
      this.renderLoggedIn(user);
    } else {
      this.renderLoggedOut();
    }
  }

  private renderLoggedOut(): void {
    this.loginContainer.removeAll(true);
    const cx = BASE_WIDTH / 2;
    const cy = BASE_HEIGHT * 0.72;

    // 패널
    const panel = this.add.graphics();
    panel.fillStyle(0x001155, 0.50);
    panel.fillRoundedRect(cx - 440, cy - 88, 880, 176, 20);
    panel.lineStyle(2, 0x4466cc, 0.6);
    panel.strokeRoundedRect(cx - 440, cy - 88, 880, 176, 20);
    this.loginContainer.add(panel);

    // 안내 텍스트
    const label = this.add.text(cx, cy - 46, '로그인하고 기록을 저장하세요', {
      fontSize: '34px', color: '#99aaee',
    }).setOrigin(0.5);
    this.loginContainer.add(label);

    // 게스트로 시작 버튼
    const btnW = 560;
    const by = cy + 36;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x2255aa, 1);
    btnBg.fillRoundedRect(cx - btnW / 2, by - 40, btnW, 80, 18);
    this.loginContainer.add(btnBg);

    const btnTxt = this.add.text(cx, by, '게스트로 시작', {
      fontSize: '46px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => void authService.signInAsGuest())
      .on('pointerover', () => { btnBg.setAlpha(0.8); btnTxt.setAlpha(0.8); })
      .on('pointerout',  () => { btnBg.setAlpha(1);   btnTxt.setAlpha(1); });
    this.loginContainer.add(btnTxt);
  }

  private renderLoggedIn(user: User): void {
    // 로그인 완료 → MainScene으로 이동 (중복 방지)
    if (this.transitioning) return;
    this.transitioning = true;

    this.loginContainer.removeAll(true);
    const cx = BASE_WIDTH / 2;
    const cy = BASE_HEIGHT * 0.72;

    // 패널
    const panel = this.add.graphics();
    panel.fillStyle(0x002244, 0.55);
    panel.fillRoundedRect(cx - 440, cy - 64, 880, 128, 20);
    panel.lineStyle(2, 0x44aaff, 0.5);
    panel.strokeRoundedRect(cx - 440, cy - 64, 880, 128, 20);
    this.loginContainer.add(panel);

    // 아바타 원
    const avatarX = cx - 360;
    const isGuest = user.is_anonymous === true;
    const displayName = isGuest
      ? '게스트'
      : ((user.user_metadata?.['full_name'] as string | undefined)
          ?? user.email
          ?? '플레이어');
    const initial = displayName.charAt(0);
    const avatarBg = this.add.graphics();
    avatarBg.fillStyle(0x2266cc, 1);
    avatarBg.fillCircle(avatarX, cy, 44);
    this.loginContainer.add(avatarBg);

    const avatarTxt = this.add.text(avatarX, cy, initial.toUpperCase(), {
      fontSize: '44px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);
    this.loginContainer.add(avatarTxt);

    // 유저명
    const nameTxt = this.add.text(cx - 290, cy, displayName, {
      fontSize: '42px', color: '#ddeeff',
    }).setOrigin(0, 0.5);
    this.loginContainer.add(nameTxt);

    // 잠시 후 MainScene으로 이동
    this.time.delayedCall(400, () => {
      if (this.scene.isActive(SCENE_KEYS.TITLE)) {
        this.scene.start(SCENE_KEYS.MAIN);
      }
    });
  }
}
