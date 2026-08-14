import { BASE_HEIGHT } from './baseDimensions';

/**
 * UI 레이아웃 중앙 설정.
 * 모든 UI 위치·여백 값은 여기서 조정한다.
 *
 * 좌표계: Phaser 화면 좌표 (Y=0 상단, Y=BASE_HEIGHT 하단)
 * 해상도: BASE_WIDTH × BASE_HEIGHT (1080 × 1920)
 */
export const UI_LAYOUT = {
  hud: {
    top:  40,  // 화면 상단에서 HUD까지 여백 (px)
    side: 24,  // 화면 좌우에서 HUD 요소까지 여백 (px)
  },

  meta: {
    right:    24,  // 오른쪽 패널: 화면 오른쪽 끝에서 아이콘 중심까지 여백
    left:     24,  // 왼쪽 패널: 화면 왼쪽 끝에서 아이콘 중심까지 여백
    top:     360,  // 메타 아이콘 패널 첫 번째 아이콘의 시작 Y
    gap:      20,  // 아이콘 간 수직 간격 (px)
    iconSize: 110, // 아이콘 기준 크기 (가로/세로, px)
  },

  action: {
    height: 240, // 하단 버튼 패널 높이 (px)
    bottom:   0, // 버튼 패널 하단에서 화면 끝까지 여백 (safe area용)
  },

  startPlatform: {
    /**
     * 시작 구름섬 풍선 꼭지와 버튼 영역 상단 사이의 최소 여백 (px).
     *
     * 풍선 꼭지가 구름 center 기준 +128px 아래까지 내려오므로
     * cloud body(+36px)가 아닌 balloon tip 기준으로 계산한다.
     *
     * 제약: cloud.centerY + orbitRadiusY + balloon_tip_local + bottomGap <= ACTION_AREA_TOP
     *  → c0 기준(orbitRadiusY=22, balloon_tip_local≈128):
     *       centerY <= ACTION_AREA_TOP - 22 - 128 - 60 = 1470
     */
    bottomGap: 60,
  },
} as const;

/** 버튼/액션 패널 상단 Y (= 게임 월드와 UI Overlay의 시각적 경계). */
export const ACTION_AREA_TOP =
  BASE_HEIGHT - UI_LAYOUT.action.height - UI_LAYOUT.action.bottom;
// 1920 - 240 - 0 = 1680
