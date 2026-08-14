# UI Architecture — 안 떨어질개: 구름섬 점프

---

## 기본 개념

게임 화면은 **두 개의 독립적인 레이어**로 구성된다.

```
Layer 1 — Game World (게임 월드, 화면 전체 사용)
─────────────────────────────────────────────
Background / 구름섬 / 플레이어 / 이펙트
→ 카메라 이동에 따라 스크롤됨

Layer 2 — UI Overlay (화면 고정, 카메라 무관)
─────────────────────────────────────────────
HUD / 메타 아이콘 / 하단 버튼 패널
→ scrollFactor(0) 으로 항상 화면 고정
```

게임 월드는 HUD나 버튼 영역 때문에 잘리지 않는다.  
UI 영역은 게임 월드 위에 올라가는 Overlay 일 뿐이다.

---

## 화면 구역 개념도

```
┌────────────────────────────────┐  Y = 0
│  ← HUD (Overlay) →            │
│  점수 / BEST / ⏸              │
│                                │
│                   ┌──────────┐ │
│                   │  RIGHT   │ │
│                   │  META    │ │
│   GAME WORLD      │  ICONS   │ │  ← 우측 메타 아이콘 (Overlay)
│   (전체 화면)      │  [SHOP]  │ │
│                   │  [MISS.] │ │
│                   └──────────┘ │
│                                │
│        🐶 플레이어              │
│     ☁ 시작 구름섬 ☁            │
│                                │
│     ← 최소 여백 (bottomGap) →  │
├────────────────────────────────┤  Y = ACTION_AREA_TOP (1680)
│          [ PLAY ]              │  ← 액션 패널 (Overlay)
│      하단 버튼·조작 영역         │
└────────────────────────────────┘  Y = 1920
```

---

## 레이어 구조 (Depth)

```ts
// src/config/constants.ts
DEPTH = {
  BACKGROUND:   0,   // 배경 그래픽
  DECOR_CLOUD:  1,   // 장식용 구름 (패럴랙스)
  CLOUD_ISLAND: 2,   // 구름섬 (착지 가능 발판)
  OBSTACLE:     5,   // 새떼, 번개 장애물
  ITEM:         7,   // 별, 아이템
  PLAYER:      10,   // 플레이어 캐릭터
  EFFECT:      20,   // 파티클, 이펙트
  HUD:        100,   // 모든 UI Overlay (HUD, 메타 아이콘, 버튼 패널)
  POPUP:      200,   // 팝업, 모달
}
```

**원칙**: 게임 오브젝트(0~20) < UI Overlay(100) < 팝업(200)

---

## UI 영역 분류

### 1. HUD (상단 고정)
점수, 최고점수, 일시정지 버튼 등 기본 게임 정보 영역.

```
┌────────────────────────────────────┐
│ 점수 (중앙)         ⏸ (우상단)    │
│ BEST XX (중앙)                     │
└────────────────────────────────────┘
```

- **클래스**: `src/ui/GameHud.ts`
- **위치 기준**: `UI_LAYOUT.hud.top` / `UI_LAYOUT.hud.side`

---

### 2. 좌/우 메타 아이콘 영역 (중단 고정)
상점, 미션, 이벤트 등 메타 콘텐츠 진입 버튼을 세로로 배치하는 영역.

현재 좌측은 비어 있으며, 우측에 아이콘을 추가할 수 있다.

- **클래스**: `src/ui/MetaIconPanel.ts`
- **위치 기준**: `UI_LAYOUT.meta`

```ts
// GameScene.setupUILayers()
this.leftMetaPanel  = new MetaIconPanel(this, 'left');
this.rightMetaPanel = new MetaIconPanel(this, 'right');

// 아이콘 추가 예시 (향후)
const shopBtn = this.add.text(0, 0, '🛒', { fontSize: '60px' });
this.rightMetaPanel.addIcon(shopBtn);
// → 자동으로 아래로 쌓임
```

---

### 3. 하단 액션 패널 (하단 고정)
플레이 버튼, 방향 휠, 점프 버튼 등 조작 컨트롤 영역.

- **클래스**: `src/ui/ActionPanel.ts` (패널 배경)
- 실제 컨트롤 (DirectionWheel, 점프 버튼 그래픽)은 `GameScene`이 직접 소유
- **위치 기준**: `UI_LAYOUT.action`

```ts
this.actionPanel.top     // 패널 상단 Y = ACTION_AREA_TOP = 1680
this.actionPanel.centerY // 버튼 배치 중심 Y = 1800
this.actionPanel.height  // 패널 높이 = 240
```

---

## 레이아웃 중앙 설정 파일

**`src/config/uiLayout.ts`** — UI 위치·여백은 이 파일 한 곳에서 조정한다.

```ts
export const UI_LAYOUT = {
  hud: {
    top:  40,   // HUD 상단 여백 (px)
    side: 24,   // HUD 좌우 여백 (px)
  },

  meta: {
    right:   24,  // 우측 패널: 화면 오른쪽 끝에서 아이콘 중심까지 여백
    left:    24,  // 좌측 패널: 화면 왼쪽 끝에서 아이콘 중심까지 여백
    top:    360,  // 첫 번째 아이콘 시작 Y
    gap:     20,  // 아이콘 간 수직 간격 (px)
    iconSize: 110, // 아이콘 기준 크기 (px)
  },

  action: {
    height: 240,  // 버튼 패널 높이 (px)
    bottom:   0,  // 버튼 패널 하단~화면 끝 여백 (safe area 적용 시 증가)
  },

  startPlatform: {
    bottomGap: 60, // 시작 구름 하단 ↔ 버튼 패널 상단 최소 간격 (px)
  },
};

// 파생값: 버튼 패널 상단 Y
export const ACTION_AREA_TOP =
  BASE_HEIGHT - UI_LAYOUT.action.height - UI_LAYOUT.action.bottom;
// = 1920 - 240 - 0 = 1680
```

---

## 시작 구름섬 위치 제약

게임 월드는 전체 화면을 사용하지만,  
**시작 구름섬의 초기 배치만** 버튼 패널과 겹치지 않도록 보정한다.

```
제약식:
  cloud.centerY + orbitRadiusY + height/2 + bottomGap ≤ ACTION_AREA_TOP

c0 기준 (orbitRadiusY=22, height=72, bottomGap=60):
  centerY ≤ 1680 - 22 - 36 - 60 = 1562

→ 현재 설정: centerY = 1560
  cloudBodyBottom(max) = 1560 + 22 + 36 = 1618
  gap = 1680 - 1618 = 62px  ✓
```

플레이어는 구름 topY 기준으로 배치되므로,  
버튼 패널·구름·플레이어가 순서대로 겹치지 않는다:

```
플레이어 y ≈ 1449
구름 body 최하단 ≈ 1618
  ↕ 62px 여백
버튼 패널 상단 ≈ 1680
```

---

## Safe Area 확장 방법

모바일 기기의 노치, Dynamic Island, 하단 홈 인디케이터 대응:

```ts
// src/config/uiLayout.ts 에서 조정
action: {
  height: 240,
  bottom: 40,  // ← 이 값을 올리면 ACTION_AREA_TOP이 올라가고
               //   시작 구름 제약도 자동 연동
},

hud: {
  top: 72,     // ← 노치 영역 회피 시 증가
  side: 24,
},
```

Capacitor SafeArea Plugin 을 연동하면 이 값에 네이티브 safe area inset을 주입하면 된다.

---

## 향후 메타 아이콘 추가 가이드

```ts
// 1. GameScene.setupUILayers() 에서 아이콘 생성 후 addIcon() 호출
private setupUILayers(): void {
  this.leftMetaPanel  = new MetaIconPanel(this, 'left');
  this.rightMetaPanel = new MetaIconPanel(this, 'right');

  // 상점 버튼 추가 예시
  const shopLabel = this.add.text(0, 0, 'SHOP', {
    fontSize: '36px',
    color: '#ffffff',
    backgroundColor: '#1155cc',
    padding: { x: 16, y: 10 },
  }).setOrigin(0.5);
  shopLabel.setInteractive().on('pointerdown', () => {
    // 상점 씬 or 팝업 열기
  });
  this.rightMetaPanel.addIcon(shopLabel);

  // 미션 버튼 추가
  // this.rightMetaPanel.addIcon(missionBtn);
}

// 2. MetaIconPanel.addIcon() 이 위치를 자동으로 쌓아줌
//    → 아이콘 추가 순서 = 위에서 아래 배치 순서
```

---

## 파일 맵

```
src/
├── config/
│   ├── uiLayout.ts       ← UI 레이아웃 중앙 설정 (위치·여백 수정 시 여기만)
│   └── constants.ts      ← DEPTH 상수 (게임/UI 렌더 순서)
│
└── ui/
    ├── GameHud.ts        ← HUD (점수, BEST, 일시정지)
    ├── ActionPanel.ts    ← 하단 버튼 영역 배경
    ├── MetaIconPanel.ts  ← 좌/우 메타 아이콘 컨테이너
    ├── DirectionWheel.ts ← 방향 휠 컨트롤 (GameScene 소유)
    └── ResultPanel.ts    ← 결과 패널
```
