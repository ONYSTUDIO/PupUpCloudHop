# Pup Up! Cloud Hop — 안 떨어질개: 구름섬 점프

모바일 원터치 캐주얼 점프 게임.  
강아지 캐릭터가 궤도를 따라 움직이는 구름섬 사이를 점프하며 최고 기록을 갱신하는 게임입니다.

---

## 기술 스택

| 역할 | 기술 |
|------|------|
| 게임 엔진 | [Phaser 3](https://phaser.io/) |
| 언어 | TypeScript (strict) |
| 빌드 | Vite |
| 앱 패키징 | Capacitor |
| 저장 | localStorage (추후 Capacitor Preferences) |
| 플랫폼 (1차) | 모바일 웹 HTML5 |
| 플랫폼 (2차) | Android / iOS |

---

## 설치

```bash
npm install
```

---

## 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 으로 접속합니다.  
Chrome DevTools → Toggle device toolbar (Ctrl+Shift+M) 로 모바일 화면을 시뮬레이션할 수 있습니다.

---

## 웹 빌드

```bash
npm run build
```

빌드 결과물은 `dist/` 폴더에 생성됩니다.

빌드 결과물 미리보기:
```bash
npm run preview
```

---

## Capacitor 사용 방법

### 웹 빌드 + 네이티브 동기화

```bash
npm run cap:sync
```

### Android 프로젝트 추가 및 실행

```bash
# Android 프로젝트 최초 생성
npx cap add android

# 빌드 + 동기화 + Android Studio 열기
npm run cap:android
```

### iOS 프로젝트 추가 및 실행

```bash
# iOS 프로젝트 최초 생성 (macOS + Xcode 필요)
npx cap add ios

# 빌드 + 동기화 + Xcode 열기
npm run cap:ios
```

---

## 주요 폴더 설명

```
src/
├── config/       게임 설정값 (gameConfig, gameplayConfig, constants)
├── scenes/       Phaser Scene (Boot → Preload → Title → Game → Result)
├── entities/     게임 오브젝트 (Player, CloudIsland)
├── systems/      게임 로직 시스템 (Jump, Collision, Score, Movement)
├── managers/     사이드이펙트 관리 (Audio, Input, Save)
├── ui/           HUD 및 결과 화면 UI
├── types/        공용 TypeScript 타입
└── utils/        수학 헬퍼, 스토리지 헬퍼

public/
└── assets/       이미지, 오디오, 폰트 (현재 비어있음 — 프로토타입은 Graphics 사용)

docs/             기획/기술 문서
```

---

## 현재 구현 범위

- [x] 프로젝트 초기 구조 (Vite + TypeScript + Phaser 3)
- [x] Capacitor 기본 설정
- [x] 5개 씬 스켈레톤 (Boot / Preload / Title / Game / Result)
- [x] Phaser Graphics 기반 프로토타입 (이미지 에셋 불필요)
  - [x] 구름섬 타원 궤도 이동
  - [x] 강아지 캐릭터 도형 표현
  - [x] 원터치 점프
  - [x] 착지 판정 (아랫방향 낙하 + 윗면 충돌만 인정)
  - [x] 추락 게임 오버
  - [x] 점수 / 최고 점수 HUD
  - [x] 카메라 위로 따라가기
- [x] localStorage 저장 (최고 점수 / 사운드 / 진동 설정)
- [x] 모바일 터치 / 확대 방지 / Safe Area 대응
- [x] 가로 모드 안내 표시
- [x] 앱 백그라운드 이동 시 자동 일시정지

---

## 이후 개발 예정

1. **P1** — 실제 캐릭터 리소스, 점프 애니메이션, 사운드, 파티클
2. **P1** — 무한 스크롤 / 동적 구름 스폰
3. **P2** — 장애물, 아이템, 캐릭터 스킨, 리더보드

자세한 항목은 [`docs/TODO.md`](docs/TODO.md) 를 참고하세요.

---

## 라이선스

Private — All rights reserved. ONYSTUDIO.
