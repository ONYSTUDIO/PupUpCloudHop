import Phaser from 'phaser';
import { DEPTH } from '@config/constants';
import { UI_LAYOUT } from '@config/uiLayout';
import { BASE_WIDTH } from '@config/gameConfig';

/**
 * 화면 좌측 또는 우측에 세로로 배치되는 메타 아이콘 패널.
 *
 * 현재는 구조만 준비되어 있으며, addIcon()으로 아이콘을 추가할 수 있다.
 *
 * 사용 예:
 *   rightMetaPanel.addIcon(shopButton);
 *   rightMetaPanel.addIcon(missionButton);
 */
export class MetaIconPanel {
  private container: Phaser.GameObjects.Container;
  private nextLocalY: number = 0;

  /**
   * @param scene - Phaser Scene
   * @param side  - 'left' | 'right'
   */
  constructor(scene: Phaser.Scene, side: 'left' | 'right') {
    const iconHalf = UI_LAYOUT.meta.iconSize / 2;
    const x = side === 'right'
      ? BASE_WIDTH - UI_LAYOUT.meta.right - iconHalf
      : UI_LAYOUT.meta.left + iconHalf;

    this.container = scene.add
      .container(x, UI_LAYOUT.meta.top)
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD);
  }

  /**
   * 아이콘을 패널에 추가한다.
   * Container 로컬 좌표로 자동 배치되며, 이후 아이콘은 아래로 쌓인다.
   */
  addIcon(icon: Phaser.GameObjects.GameObject): void {
    if ('setPosition' in icon) {
      (icon as Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject)
        .setPosition(0, this.nextLocalY);
    }
    this.container.add(icon);
    this.nextLocalY += UI_LAYOUT.meta.iconSize + UI_LAYOUT.meta.gap;
  }

  get gameObject(): Phaser.GameObjects.Container {
    return this.container;
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  destroy(): void {
    this.container.destroy();
  }
}
