새로운 모바일 캐주얼 게임 프로젝트의 초기 개발 환경과 기본 구조를 구성해줘.

# 1. 프로젝트 정보

- 프로젝트 한글명: 안 떨어질개: 구름섬 점프
- 프로젝트 영문명: Pup Up! Cloud Hop
- 프로젝트 약칭: 안떨어질개
- 프로젝트 폴더명: PupUpCloudHop
- 장르: 모바일 원터치 캐주얼 점프 게임
- 화면 방향: 세로형 Portrait
- 목표 플랫폼:
  - 1차: 모바일 웹 HTML5
  - 2차: Android / iOS 앱 패키징
  - 최종: Google Play Store / Apple App Store 출시

# 2. 게임 기본 콘셉트

하늘에 떠 있는 구름섬들이 각각 정해진 궤도를 따라 움직이고 있다.

메인 캐릭터인 강아지는 현재 구름섬 위에 올라가 있으며, 유저가 화면을 터치하면 다음 구름섬을 향해 점프한다.

다음 구름섬에 정상적으로 착지하면 점수가 올라가고, 계속해서 더 멀리 이동하며 최고 기록을 갱신하는 방식이다.

구름섬은 바람 소용돌이 또는 상승기류를 중심으로 원형이나 타원형 궤도를 따라 움직인다.

캐릭터가 구름섬에 착지하지 못하고 아래로 떨어지거나 장애물에 충돌하면 게임이 종료된다.

# 3. 초기 기술 스택

아래 구성을 기준으로 프로젝트를 생성해줘.

## 게임 클라이언트

- TypeScript
- Phaser 3
- Vite
- HTML5 Canvas
- CSS
- ESLint
- Prettier

## 모바일 앱 패키징

- Capacitor
- Android 프로젝트 생성 가능 구조
- iOS 프로젝트 생성 가능 구조

앱 패키징은 초기 단계에서는 실제 Android/iOS 네이티브 프로젝트를 생성하지 않아도 된다.

다만 추후 아래 명령으로 추가할 수 있도록 Capacitor 기본 설정까지 구성해줘.

```bash
npx cap add android
npx cap add ios
```

# 4. 개발 원칙

- 모바일 세로 화면을 기준으로 개발
- 기본 기준 해상도는 1080 × 1920 비율
- 실제 렌더링은 다양한 모바일 화면에 대응하도록 반응형 처리
- 게임 비율은 9:16 유지
- 화면이 남는 경우 배경 영역을 확장하고 게임 오브젝트 비율은 유지
- 터치 입력을 우선으로 개발
- 데스크톱 테스트를 위해 마우스 입력도 동일하게 지원
- 게임 로직과 화면 UI 로직을 분리
- 매직 넘버 사용을 최소화하고 설정값은 별도 파일에서 관리
- 리소스 파일명은 영문 소문자와 snake_case 사용
- 프로젝트 전체에 TypeScript strict 모드 적용
- 불필요한 외부 라이브러리는 추가하지 않기

# 5. 프로젝트 디렉터리 구조

아래와 비슷한 형태로 구성해줘.

PupUpCloudHop/
├─ public/
│  └─ assets/
│     ├─ images/
│     │  ├─ backgrounds/
│     │  ├─ characters/
│     │  ├─ platforms/
│     │  ├─ obstacles/
│     │  ├─ effects/
│     │  └─ ui/
│     ├─ audio/
│     │  ├─ bgm/
│     │  └─ sfx/
│     └─ fonts/
│
├─ src/
│  ├─ config/
│  │  ├─ gameConfig.ts
│  │  ├─ gameplayConfig.ts
│  │  └─ constants.ts
│  │
│  ├─ scenes/
│  │  ├─ BootScene.ts
│  │  ├─ PreloadScene.ts
│  │  ├─ TitleScene.ts
│  │  ├─ GameScene.ts
│  │  └─ ResultScene.ts
│  │
│  ├─ entities/
│  │  ├─ Player.ts
│  │  ├─ CloudIsland.ts
│  │  └─ Obstacle.ts
│  │
│  ├─ systems/
│  │  ├─ JumpSystem.ts
│  │  ├─ PlatformMovementSystem.ts
│  │  ├─ CollisionSystem.ts
│  │  ├─ ScoreSystem.ts
│  │  └─ SpawnSystem.ts
│  │
│  ├─ managers/
│  │  ├─ AudioManager.ts
│  │  ├─ InputManager.ts
│  │  └─ SaveManager.ts
│  │
│  ├─ ui/
│  │  ├─ GameHud.ts
│  │  └─ ResultPanel.ts
│  │
│  ├─ types/
│  │  └─ game.ts
│  │
│  ├─ utils/
│  │  ├─ math.ts
│  │  └─ storage.ts
│  │
│  ├─ main.ts
│  └─ style.css
│
├─ capacitor.config.ts
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ eslint.config.js
├─ .prettierrc
├─ .gitignore
└─ README.md

구조가 과도하게 복잡하다면 현재 프로토타입 단계에 맞게 일부를 간소화해도 된다.

다만 다음 항목은 반드시 분리해줘.

- Scene
- Player
- CloudIsland
- 점프 처리
- 구름섬 이동 처리
- 점수 처리
- 게임 설정값
- 저장 처리

# 6. 최초 구현 범위

초기 프로젝트 생성과 함께 실제 실행 가능한 최소 프로토타입도 구현해줘.

## 6-1. BootScene

- 게임 최초 실행 설정
- 배경색 설정
- 기기 화면 크기 대응
- 다음 Scene으로 이동

## 6-2. PreloadScene

- 임시 리소스 로딩
- 현재 실제 이미지 리소스가 없으므로 그래픽 도형으로 대체 가능
- 로딩 완료 후 TitleScene 이동

## 6-3. TitleScene

다음 UI를 임시로 구현해줘.

- 게임명: 안 떨어질개
- 영문명: Pup Up! Cloud Hop
- 게임 시작 버튼

시작 버튼을 누르면 GameScene으로 이동한다.

## 6-4. GameScene

실제 이미지 없이 Phaser Graphics를 이용해 프로토타입을 구현해줘.

### 배경

- 하늘색 그라데이션 느낌
- 임시 구름 장식
- 세로형 화면
- 플레이어
- 임시 원 또는 단순한 강아지 형태의 도형
- 현재 구름섬 위에 고정되어 함께 이동
- 화면 터치 시 점프

### 구름섬

- 최소 4개 이상 배치
- 각각 다른 중심점, 반지름, 속도를 가짐
- 지정된 중심점을 기준으로 원형 또는 타원형 궤도 이동
- 플레이어가 올라가 있는 구름섬도 계속 이동
- 구름섬의 현재 위치에 따라 플레이어 위치도 함께 갱신

### 점프

초기 버전에서는 복잡한 조준 기능 없이 아래 방식으로 구현해줘.

- 화면을 한 번 터치하면 플레이어가 바라보는 방향으로 점프
- 점프 중에는 현재 구름섬의 영향에서 벗어남
- 다른 구름섬에 닿으면 착지
- 착지 성공 시 해당 구름섬에 종속
- 착지 성공 시 점수 +1
- 착지 실패 후 화면 아래로 떨어지면 게임 오버

점프 힘, 중력, 이동 속도는 gameplayConfig.ts에서 관리해줘.

### 카메라

- 프로토타입 단계에서는 고정 카메라 사용 가능
- 플레이어가 일정 높이 이상 이동하면 카메라가 위로 따라가는 구조를 고려해 코드 확장이 가능하게 작성
- 이후 무한 스크롤 방식으로 변경하기 쉽도록 구성

### HUD

- 현재 점수
- 최고 점수
- 일시정지 버튼은 자리만 만들어도 됨

## 6-5. ResultScene

- 게임 오버 문구
- 현재 점수
- 최고 점수
- 다시 시작 버튼
- 타이틀로 이동 버튼

# 7. 구름섬 이동 데이터 구조

구름섬은 각 오브젝트가 아래와 같은 값을 가질 수 있도록 타입을 설계해줘.

```bash
interface CloudIslandConfig {
  id: string;
  centerX: number;
  centerY: number;
  orbitRadiusX: number;
  orbitRadiusY: number;
  orbitSpeed: number;
  startAngle: number;
  rotationDirection: 1 | -1;
  width: number;
  height: number;
}
```

현재 위치는 대략 아래 개념으로 계산하면 된다.

```bash
x = centerX + Math.cos(angle) * orbitRadiusX;
y = centerY + Math.sin(angle) * orbitRadiusY;
```

프레임마다 angle 값을 갱신하여 구름섬이 원형 또는 타원형으로 움직이게 해줘.

# 8. 플레이어 착지 처리

플레이어가 점프 중 구름섬 위쪽 영역과 충돌했을 때만 착지하도록 구현해줘.

아래 조건을 고려해줘.

- 플레이어가 아래 방향으로 떨어지는 중일 때만 착지
- 구름섬의 윗면에 충돌했을 때만 착지
- 아래나 옆에서 부딪힌 경우에는 착지 처리하지 않음
- 착지한 순간 플레이어의 세로 속도를 0으로 초기화
- 플레이어를 구름섬 윗면 위치로 보정
- 현재 탑승 중인 구름섬 정보를 갱신
- 같은 구름섬에 연속 착지해 점수가 중복 증가하지 않도록 처리

# 9. 저장 기능

브라우저 localStorage를 이용해 다음 정보를 저장해줘.

- 최고 점수
- 사운드 설정
- 진동 설정

SaveManager를 통해 직접 localStorage에 접근하지 않고 관리하도록 해줘.

추후 Capacitor Preferences로 변경하기 쉽도록 인터페이스를 분리해줘.

# 10. Capacitor 설정

다음 조건으로 기본 설정을 생성해줘.

- appName: Pup Up! Cloud Hop
- appId 임시값: com.onystudio.pupupcloudhop
- webDir: dist

package.json에 아래 명령을 추가해줘.

```bash
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "format": "prettier --write .",
    "cap:sync": "npm run build && npx cap sync",
    "cap:android": "npm run build && npx cap sync android && npx cap open android",
    "cap:ios": "npm run build && npx cap sync ios && npx cap open ios"
  }
}
```

실제 환경에 맞게 TypeScript 빌드 명령이 문제가 있다면 적절히 수정해도 된다.

# 11. 모바일 앱 출시를 고려한 기본 처리

초기 단계에서 아래 사항을 고려해서 구성해줘.

- 모바일 브라우저 기본 스크롤 방지
- 확대 및 더블 탭 줌 방지
- 터치 중 텍스트 선택 방지
- 화면 바운스 효과 방지
- Safe Area 대응이 가능하도록 CSS 변수 구성
- 화면 회전 시 세로 모드 안내 가능 구조
- 앱이 백그라운드로 이동하면 게임 일시정지
- 다시 활성화되면 자동 재개하지 않고 일시정지 화면 유지
- 오디오가 중복 재생되지 않도록 처리
- 다양한 기기에서 고해상도 Canvas가 지나치게 무거워지지 않도록 resolution 제한 고려

# 12. README 작성

README.md에 아래 내용을 포함해줘.

- 프로젝트 소개
- 기술 스택
- 설치 방법
- 개발 서버 실행 방법
- 웹 빌드 방법
- Capacitor 사용 방법
- Android 프로젝트 추가 방법
- iOS 프로젝트 추가 방법
- 주요 폴더 설명
- 현재 구현 범위
- 이후 개발 예정 항목

# 13. 문서 추가

프로젝트 루트에 docs 폴더를 만들고 아래 문서를 생성해줘.

docs/
├─ GAME_CONCEPT.md
├─ GAME_RULES.md
├─ TECH_STACK.md
└─ TODO.md

## GAME_CONCEPT.md

- 게임명
- 게임 한 줄 설명
- 세계관
- 핵심 플레이
- 목표 플랫폼
- 예상 플레이 시간
- 타깃 유저
- 원터치 캐주얼 게임이라는 방향

## GAME_RULES.md

현재 확정된 최소 룰을 정리해줘.

- 구름섬이 궤도를 따라 이동
- 플레이어가 구름섬 사이를 점프
- 착지 성공 시 점수 증가
- 추락 시 게임 종료
- 최고 기록 저장

아직 확정되지 않은 세부 룰은 검토 필요로 표시해줘.

## TECH_STACK.md

- TypeScript
- Phaser 3
- Vite
- Capacitor
- HTML5 Canvas
- localStorage
- 추후 Android/iOS 앱 변환 구조

각 기술을 사용하는 이유도 간단히 작성해줘.

## TODO.md

다음 단계의 작업 목록을 우선순위별로 작성해줘.

예시:

### P0

- 기본 이동 프로토타입
- 점프와 착지
- 게임 오버
- 점수
- 모바일 화면 대응

### P1

- 실제 강아지 캐릭터 리소스 적용
- 구름섬 리소스 적용
- 점프 애니메이션
- 파티클
- 사운드
- 진동

### P2

- 구름섬 패턴 다양화
- 장애물
- 아이템
- 캐릭터 스킨
- 미션
- 광고
- 인앱 상품
- 리더보드

# 14. 현재 제외 범위

현재 초기 프로젝트에서는 아래 항목을 구현하지 않아도 된다.

- 서버
- 회원가입 및 로그인
- 데이터베이스
- 광고 SDK
- 결제
- 앱스토어 연동
- 리더보드 서버
- 업적
- 푸시 알림
- 실제 게임 아트
- 실제 사운드 리소스

단, 추후 추가할 수 있도록 코드가 지나치게 강하게 결합되지 않게 구성해줘.

# 15. 작업 결과 보고 방식

작업이 끝나면 아래 형식으로 정리해서 알려줘.

1. 생성하거나 수정한 파일 목록
2. 프로젝트 구조
3. 실행 방법
4. 현재 구현된 기능
5. 임시로 사용한 도형 및 리소스
6. 다음에 우선 구현해야 할 기능
7. 확인이 필요한 기획 사항
8. 빌드 또는 실행 중 주의사항

프로젝트를 생성한 뒤 실제로 아래 명령을 실행해 오류가 없는지 확인해줘.

```bash
npm install
npm run build
```

가능하다면 lint도 실행해줘.

```bash
npm run lint
```

오류가 발생하면 원인을 수정하고, 해결되지 않은 오류는 숨기지 말고 결과 보고에 정확히 적어줘.

이 구성에서는 **Phaser 3**를 사용하도록 잡았어. 일반 DOM 기반 HTML/CSS 게임보다 움직이는 구름섬, 점프 물리, 충돌 판정, 파티클, 카메라 이동을 구현하기 편하고, 완성 후에는 **Capacitor**로 Android와 iOS 앱을 만들 수 있어.