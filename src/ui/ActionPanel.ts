import Phaser from 'phaser';
import { DEPTH } from '@config/constants';
import { UI_LAYOUT, ACTION_AREA_TOP } from '@config/uiLayout';
import { BASE_WIDTH } from '@config/gameConfig';

/**
 * 하단 액션(버튼) 영역 배경 패널.
 *
 * 게임 월드는 화면 전체를 사용하며, 이 패널은 그 위에 올라가는 UI Overlay.
 * 방향 휠·점프 버튼 등 실제 조작 요소는 GameScene에서 직접 생성하며,
 * 이 클래스는 패널 배경과 레이아웃 참조값만 담당한다.
 */
export class ActionPanel {
  private panelBg: Phaser.GameObjects.Graphics;

  /** 패널 상단 Y (= 버튼 영역이 시작되는 화면 좌표). */
  readonly top: number = ACTION_AREA_TOP;

  /** 패널 높이. */
  readonly height: number = UI_LAYOUT.action.height;

  /** 패널 수직 중심 Y. 버튼·컨트롤 배치 기준점으로 사용. */
  readonly centerY: number = ACTION_AREA_TOP + UI_LAYOUT.action.height / 2;

  constructor(scene: Phaser.Scene) {
    this.panelBg = scene.add.graphics()
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD - 2);

    this.panelBg.fillStyle(0x000510, 0.52);
    this.panelBg.fillRect(0, ACTION_AREA_TOP, BASE_WIDTH, UI_LAYOUT.action.height);
    this.panelBg.lineStyle(1.5, 0x4466bb, 0.5);
    this.panelBg.lineBetween(0, ACTION_AREA_TOP, BASE_WIDTH, ACTION_AREA_TOP);
  }

  setVisible(visible: boolean): void {
    this.panelBg.setVisible(visible);
  }

  destroy(): void {
    this.panelBg.destroy();
  }
}
