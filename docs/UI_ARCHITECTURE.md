# UI Architecture — 안 떨어질개: 구름섬 점프

---

## 씬 구성 및 흐름

```
Boot → Preload
           ├── [이미 로그인] ──────────────────────────────── MainScene
           └── [미로그인]    → TitleScene
                                  └── [게스트/로그인 완료] → MainScene

MainScene ──────────────────────────────────────────────────────────────
  ├── [게임 시작] ──── GameScene (패턴 파라미터 전달)
  └── [업그레이드] ─── ShopScene (overlay, upgrade 탭 pre-select)
  └── [상점/룰렛] ──── ShopScene / RouletteScene (overlay)

GameScene ──────────────────────────────────────────────────────────────
  ├── [⏸ 일시정지] → PausePopup 팝업
  │      ├── [다시하기]  → GameScene (같은 패턴으로 재시작)
  │      ├── [메인으로]  → MainScene (확인 없이 바로 이동)
  │      └── [계속하기]  → 팝업 닫고 재개
  └── [게임오버] ──── ResultScene

ResultScene ────────────────────────────────────────────────────────────
  ├── [다시하기] → GameScene (같은 패턴)
  └── [홈으로]   → MainScene
```

### 씬별 역할 요약

| 씬 | 역할 | 전환 출처 |
|----|------|-----------|
| `BootScene` | 초기 설정 (Phaser 시스템) | 자동 |
| `PreloadScene` | 에셋 로드 + 로그인 상태 분기 | BootScene |
| `TitleScene` | 로그인 선택 (게스트 / 소셜) | PreloadScene (미로그인 시) |
| `MainScene` | 홈 화면 (캐릭터·패턴 선택·메타) | TitleScene, ResultScene, PausePopup |
| `GameScene` | 인게임 | MainScene |
| `ResultScene` | 게임 결과 | GameScene |
| `ShopScene` | 상점 (overlay) | MainScene, GameScene |
| `RouletteScene` | 룰렛 (overlay) | MainScene, GameScene |

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

---

## 화면 구역 개념도 (GameScene)

```
┌────────────────────────────────────┐  Y = 0
│  ← HUD 1 (TopHud, 공통) →         │
│  [아바타] 이름   🪙 코인  💎 다이아  ⏸ │
├────────────────────────────────────┤
│  ← HUD 2 (ScoreHud, 인게임 전용) → │
│           점수 (큰 숫자)            │
│           BEST XX                   │
│         🚀 로켓 타이머              │
│         🧲 자석 타이머              │
├────────────────────────────────────┤
│                   ┌──────────────┐  │
│                   │  RIGHT META  │  │
│   GAME WORLD      │   [SHOP]     │  │
│   (전체 화면)      │   [ROULETTE] │  │
│                   └──────────────┘  │
│        🐶 플레이어                  │
│     ☁ 구름섬 ☁                    │
├────────────────────────────────────┤  Y = 1680
│          [ 조작 버튼 영역 ]         │
└────────────────────────────────────┘  Y = 1920
```

---

## HUD 2단 구조

### 공통 원칙

HUD를 두 개의 독립 클래스로 분리하여, **HUD 1(TopHud)은 씬에 무관하게 공통으로 사용**한다.

```
┌─────────────────────────────────────┐
│  HUD 1 — TopHud (공통)              │
│  [아바타] 이름   🪙 코인  💎 다이아  ⏸│
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  HUD 2 — ScoreHud (GameScene 전용)  │
│          점수 / BEST / 타이머        │
└─────────────────────────────────────┘
```

### TopHud (HUD 1 — 공통)

- 프로필 (아바타 원 + 이름)
- 재화 (🪙 코인, 💎 다이아)
- 일시정지 버튼 `⏸` — `onPause` 콜백이 전달될 때만 렌더링

```typescript
// MainScene — 일시정지 없음
this.topHud = new TopHud(scene, coins, diamonds);

// GameScene — 일시정지 있음
this.topHud = new TopHud(scene, coins, diamonds, () => this.togglePause());
```

### ScoreHud (HUD 2 — GameScene 전용)

- 현재 점수 (큰 숫자)
- BEST 표시
- 로켓 타이머 바 (로켓 모드 중만 표시)
- 자석 타이머 바 (자석 활성 중만 표시)

```typescript
// GameScene에서만 생성
this.scoreHud = new ScoreHud(scene, bestScore);
```

---

## MainScene 레이아웃

```
┌────────────────────────────────────┐
│  TopHud: 프로필 / 코인 / 다이아     │  (일시정지 버튼 없음)
├────────────────────────────────────┤
│                   ┌──────────────┐  │
│                   │  RIGHT META  │  │
│                   │   [SHOP]     │  │
│  최고기록 표시     │   [ROULETTE] │  │
│                   └──────────────┘  │
│                                     │
│          🐶 캐릭터 (idle bounce)     │
│                                     │
│  ┌──────────────────────────────┐   │
│  │  패턴 셀렉터  ◀  패턴명  ▶  │   │
│  └──────────────────────────────┘   │
│  ┌──────────┐  ┌──────────────┐    │
│  │ 업그레이드│  │   게임 시작  │    │
│  └──────────┘  └──────────────┘    │
└────────────────────────────────────┘
```

### 구성 요소

| 요소 | 설명 |
|------|------|
| TopHud | 프로필 + 코인 + 다이아 (일시정지 없음) |
| MetaIconPanel (우측) | 상점 · 룰렛 아이콘 |
| 캐릭터 (Graphics) | 화면 중앙, 위아래 bounce tween으로 idle 표현 |
| 최고기록 | 캐릭터 상단 표시 |
| 패턴 셀렉터 | TitleScene에서 이전 — ◀ 패턴명 ▶ 형태 |
| 게임 시작 버튼 | GameScene으로 이동 (선택된 패턴 전달) |
| 업그레이드 버튼 | ShopScene overlay (upgrade 탭 pre-select) |
| 배경 | 초원 — Graphics로 하늘 그라디언트 + 언덕 + 배경 구름 |

---

## TitleScene (간소화 후)

메인씬 도입 이후 TitleScene은 **로그인 전용 화면**으로 축소된다.

```
┌────────────────────────────────────┐
│   타이틀 로고 / 게임 제목           │
│   강아지 일러스트                   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │  로그인 안내 / 게스트 시작   │   │
│   │  [게스트로 시작]             │   │
│   │  [구글 로그인]               │   │  (소셜 로그인 추가 시)
│   └─────────────────────────────┘   │
└────────────────────────────────────┘
```

- 패턴 셀렉터 제거 → MainScene으로 이전
- 시작 버튼 제거 → MainScene에서 게임 시작
- 최고기록 제거 → MainScene에서 표시
- 로그인/게스트 완료 시 → `scene.start(SCENE_KEYS.MAIN)`

---

## 일시정지 팝업 (PausePopup)

GameScene에서 ⏸ 버튼을 누르면 기존 전체화면 overlay 대신 작은 팝업이 표시된다.

```
┌──────────────────────┐
│      일시정지         │
│                       │
│  [ 다시하기 ]         │  → GameScene 재시작 (같은 패턴)
│  [ 메인으로 ]         │  → MainScene 이동 (확인 없음)
│  [ 계속하기 ]         │  → 팝업 닫고 재개
└──────────────────────┘
```

- 클래스: `src/ui/PausePopup.ts`
- 팝업 표시 중 게임 로직 일시정지 (`scene.pause()` 또는 `isPaused = true`)
- 배경은 반투명 dim overlay (전체화면), 패널은 중앙 소형 카드
- "메인으로" 누를 경우 확인 팝업 없이 즉시 `scene.start(SCENE_KEYS.MAIN)`

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

#### TopHud — 공통 (HUD 1)
프로필, 재화, 선택적 일시정지 버튼.

- **클래스**: `src/ui/TopHud.ts`
- **씬 사용**: MainScene, GameScene

#### ScoreHud — 인게임 전용 (HUD 2)
점수, BEST, 로켓/자석 타이머.

- **클래스**: `src/ui/ScoreHud.ts`
- **씬 사용**: GameScene 전용

---

### 2. 좌/우 메타 아이콘 영역 (중단 고정)
상점, 룰렛 등 메타 콘텐츠 진입 버튼을 세로로 배치.

- **클래스**: `src/ui/MetaIconPanel.ts`
- **위치 기준**: `UI_LAYOUT.meta`
- **씬 사용**: MainScene, GameScene

---

### 3. 하단 액션 패널 (하단 고정, GameScene 전용)
점프 버튼, 방향 휠 등 조작 컨트롤 영역.

- **클래스**: `src/ui/ActionPanel.ts` (패널 배경)
- **씬 사용**: GameScene 전용

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
    right:   24,   // 우측 패널: 화면 오른쪽 끝에서 아이콘 중심까지 여백
    left:    24,   // 좌측 패널: 화면 왼쪽 끝에서 아이콘 중심까지 여백
    top:    360,   // 첫 번째 아이콘 시작 Y
    gap:     20,   // 아이콘 간 수직 간격 (px)
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

---

## 파일 맵

```
src/
├── config/
│   ├── constants.ts      ← SCENE_KEYS (MAIN 포함), DEPTH 상수
│   ├── uiLayout.ts       ← UI 레이아웃 중앙 설정 (위치·여백 수정 시 여기만)
│   └── gameConfig.ts     ← Phaser 씬 등록 (MainScene 포함)
│
├── scenes/
│   ├── BootScene.ts
│   ├── PreloadScene.ts   ← 로그인 상태 분기 (MainScene / TitleScene)
│   ├── TitleScene.ts     ← 로그인 전용 (간소화)
│   ├── MainScene.ts      ← 홈 화면 (신규)
│   ├── GameScene.ts      ← 인게임
│   ├── ResultScene.ts    ← 결과 화면
│   ├── ShopScene.ts      ← 상점 (overlay, tab 파라미터 지원)
│   └── RouletteScene.ts  ← 룰렛 (overlay)
│
└── ui/
    ├── TopHud.ts         ← HUD 1 공통 (프로필 + 재화 + 선택적 일시정지)
    ├── ScoreHud.ts       ← HUD 2 인게임 전용 (점수 + BEST + 타이머)
    ├── PausePopup.ts     ← 일시정지 팝업 (다시하기 / 메인으로 / 계속하기)
    ├── ActionPanel.ts    ← 하단 버튼 영역 배경 (GameScene 전용)
    ├── MetaIconPanel.ts  ← 좌/우 메타 아이콘 컨테이너
    ├── DirectionWheel.ts ← 방향 휠 컨트롤 (GameScene 소유)
    └── ResultPanel.ts    ← 결과 패널
```

> `GameHud.ts`는 `TopHud.ts` + `ScoreHud.ts`로 분리 대체된다.
