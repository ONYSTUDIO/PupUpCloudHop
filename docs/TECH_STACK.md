# Tech Stack — 안 떨어질개: 구름섬 점프

## 게임 클라이언트

### TypeScript
- **이유**: 타입 안전성으로 게임 로직 오류를 사전 방지. `strict` 모드 적용으로 런타임 버그 최소화.
- **버전**: 5.4+

### Phaser 3
- **이유**: HTML5 캔버스 기반 2D 게임 엔진. 씬 관리, 카메라, 입력 처리, 트윈 애니메이션이 내장되어 있어 모바일 캐주얼 게임에 적합. 향후 WebGL 렌더러를 통해 파티클·셰이더 효과도 추가 가능.
- **버전**: 3.87+

### Vite
- **이유**: 빠른 HMR(Hot Module Replacement)과 간편한 TypeScript 지원. 빌드 결과물이 작고 빠름. Capacitor와 `dist/` 폴더 기반으로 쉽게 연동 가능.
- **버전**: 5.2+

### HTML5 Canvas
- Phaser가 WebGL 또는 Canvas 2D로 렌더링. 모바일 브라우저에서 모두 지원.

---

## 앱 패키징

### Capacitor
- **이유**: 웹 앱을 Android / iOS 네이티브 앱으로 감쌀 수 있는 크로스플랫폼 도구. Cordova 대비 최신 Web API 지원이 좋고, 플러그인 생태계가 풍부함.
- 추후 `Capacitor Preferences`로 localStorage를 교체해 네이티브 저장소를 사용할 수 있도록 `StorageAdapter` 인터페이스를 통해 추상화.
- **버전**: 6.0+

---

## 저장

### localStorage
- **이유**: 추가 설정 없이 브라우저 / 웹뷰에서 바로 사용 가능. 최고 점수, 사운드, 진동 설정 등 소량의 데이터 저장에 적합.
- `StorageAdapter` 인터페이스를 통해 추후 Capacitor Preferences로 교체 가능.

---

## 코드 품질

### ESLint + Prettier
- **이유**: 코드 스타일 통일과 잠재적 버그 조기 발견.
- `@typescript-eslint` 플러그인으로 TypeScript 전용 규칙 적용.

---

## 향후 추가 예정 기술

| 기능 | 기술 후보 |
|------|-----------|
| 사운드 | Phaser Sound Manager + `.ogg` / `.mp3` |
| 진동 | Capacitor Haptics 플러그인 |
| 저장소 | Capacitor Preferences |
| 광고 | AdMob Capacitor 플러그인 |
| 인앱 결제 | Capacitor Purchases (RevenueCat) |
| 리더보드 | Firebase Firestore 또는 자체 서버 |
| 애니메이션 | Phaser Spritesheet + Texture Atlas |
| 파티클 | Phaser Particle System |
