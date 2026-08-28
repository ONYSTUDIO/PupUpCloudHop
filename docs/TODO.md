# TODO — 안 떨어질개: 구름섬 점프

---

## P0 — 핵심 프로토타입 (현재 단계)

- [x] 프로젝트 초기 환경 구성 (Vite + TypeScript + Phaser 3)
- [x] Capacitor 기본 설정
- [x] 씬 구조 (Boot / Preload / Title / Game / Result)
- [x] 구름섬 타원 궤도 이동
- [x] 강아지 캐릭터 도형 표현 (Phaser Graphics)
- [x] 원터치 점프 (가장 가까운 위쪽 구름섬 방향)
- [x] 착지 판정 (하강 중 윗면 충돌만 인정)
- [x] 추락 게임 오버
- [x] 점수 및 최고 점수 HUD
- [x] 카메라 위로 따라가기
- [x] 점수 localStorage 저장
- [x] 모바일 화면 대응 (Safe Area, 터치 잠금, 가로 모드 안내)
- [x] 앱 백그라운드 시 자동 일시정지
- [x] 방향 휠 UI + 점프 패턴 (포물선/직선) 구현
- [x] 구름섬 패턴 2가지 구현 (개별 타원 궤도 / 회오리 그룹)
- [x] 구름섬 착지 비주얼 + 풍선 충돌 위험 판정
- [ ] **플레이테스트 및 점프감 조정** (gravity, velocity 수치 튜닝)
- [x] 일시정지 기능 구현
- [ ] 게임 오버 후 카메라 하락 연출
- [x] **UI 영역 구조 분리** — HUD / 메타 아이콘 / 액션 패널 Overlay 구조화 (`UI_ARCHITECTURE.md` 참고)

---

## P1 — 리소스 & 기본 게임성

### 비주얼
- [ ] 실제 강아지 캐릭터 스프라이트 적용
- [ ] 구름섬 이미지 리소스 적용 (소/중/대 3종)
- [ ] 배경 이미지 (하늘 레이어 여러 장, 패럴랙스)
- [ ] 점프 / 낙하 / 착지 애니메이션
- [ ] 착지 성공 파티클 (구름 먼지)
- [ ] 게임 오버 연출 (강아지 추락 애니메이션)

### 사운드
- [ ] BGM 추가 (bgm_main.ogg)
- [ ] 점프 효과음 (sfx_jump.ogg)
- [ ] 착지 효과음 (sfx_land.ogg)
- [ ] 추락 효과음 (sfx_fall.ogg)
- [ ] 점수 효과음 (sfx_score.ogg)
- [ ] 사운드 On/Off 토글 버튼

### 모바일 피드백
- [ ] 착지 성공 진동 피드백 (Capacitor Haptics)
- [ ] 게임 오버 진동

### 게임성
- [x] 무한 스크롤 구현 (SpawnSystem + GameScene updateSpawn 동작 중)
- [x] 동적 구름 스폰 / 디스폰 (카메라 기준 생성·제거 작동 중)
- [ ] 난이도 곡선 (점수에 따라 구름 속도/간격 증가)
- [ ] 구름섬 크기 다양화 (현재 랜덤 범위 고정 — 점수 연동 필요)

---

## P2 — 게임성 확장

### 장애물 (구현 중)
- [x] **새떼 (BIRD_FLOCK)**: 화면 좌→우 이동, 풍선 충돌 시 구름섬 낙하
- [x] **번개 폭풍 (LIGHTNING_STORM)**: 비→경고→번개 발사 순차 연출, 타겟 구름섬 낙하
- [ ] **장애물 등장 밸런스 — 점수 기반 잠금 해제**
  - 0~9점: 장애물 없음 (진입 구간, 조작 학습)
  - 10점 돌파 시: 새떼 출현 시작
  - 30점 돌파 시: 번개 폭풍 출현 추가
  - 구현 위치: `ObstacleSystem.updateStorm()` / `.update()` 에 점수 조건 추가
- [ ] **장애물 스폰 간격 난이도 연동** (점수가 높을수록 등장 주기 단축)

### 아이템 / 패시브

#### ⭐️ 로켓 모드 (인게임 별 아이템 — 구현 완료)
- [x] 인게임 별 아이콘 스폰 시스템 구현 (StarItemSystem — 패턴1 구름 N번째마다 스폰)
- [x] 별 획득 충돌 판정 및 로켓 모드 진입 처리
- [x] 로켓 모드 직선 고속 비행 이동 로직 (3초, 중력 무시)
- [x] 로켓 모드 중 구름섬 통과 카운트 → 점수 부여
- [x] 로켓 모드 중 디버프 무적 처리 (새 무리 / 번개 충돌 무시)
- [x] 로켓 모드 진입 / 종료 비주얼 연출 (트레일 그래픽)
- [x] 로켓 모드 잔여 시간 HUD 표시 (3초 카운트다운)

#### 🫧 방어막 (게임 시작 전 선택 패시브 — 구현 완료)
- [x] 게임 시작 전 아이템 선택 UI 구현 (타이틀 화면 방어막 토글 체크박스)
- [x] 방어막 활성 상태 관리 (게임 시작 시 보호막 생성)
- [x] 캐릭터 주변 원형 비눗방울 비주얼 렌더링 (무지갯빛 테두리 + 맥동)
- [x] 번개 충돌 시 방어막 1회 소멸 처리
- [x] 새 무리 충돌 시 방어막 무시 (디버프 그대로 적용)
- [x] 방어막 소멸 연출 (비눗방울 터지는 이펙트)

#### 🏪 상점 씬 (UI — 구현 완료)
- [x] ShopScene 생성 (탭 5개: 스킨/패시브/부스터/업그레이드/코인)
- [x] 상점 아이콘 → GameScene pause + ShopScene launch 연결
- [x] 닫기 버튼 → GameScene resume
- [x] 코인 잔액 표시 (헤더)
- [x] 아이템 카드 (이름/설명/가격/상태 뱃지)
- [x] 스킨 탭: 장착하기 버튼 동작
- [x] 코인 소비 구매 동작 (잔액 부족 토스트)
- [ ] IAP 결제 연동 (미구현, 준비 중 토스트 표시)
- [ ] 스크롤 (아이템 다수 시 — 추후 구현)

#### 🌟 코인 2배 (부스터 — 미구현)
- [ ] 게임 시작 전 부스터 슬롯에서 선택
- [ ] `ScoreSystem`에 `scoreMultiplier` 필드 추가, 착지 시 배율 적용
- [ ] 최고점수 갱신 대상에서 제외 (별도 "부스터 점수" 표기)
- [ ] HUD에 🌟×2 배율 표시

#### 🧲 자석 효과 (부스터 — 구현 완료)
- [x] 게임 시작 전 타이틀 화면 토글로 선택 (테스트용 — 추후 부스터 슬롯 UI로 이전)
- [x] 10초 동안 `CollisionSystem`의 `LAND_TOLERANCE_Y` 값을 3.5배(28→98px) 확대
- [x] 착지 판정 범위가 넓어져 구름을 덜 빗나감 (체감: "미끄러질 것 같아도 착지됨")
- [x] MagnetSystem: 자기장 링 비주얼 이펙트 + 착지 범위 타원 표시
- [x] HUD 자석 타이머 표시 (10초 카운트다운 바)

#### ⏱️ 타임 슬로우 (부스터 — 미구현)
- [ ] 게임 시작 전 부스터 슬롯에서 선택
- [ ] 발동 시 `scene.time.timeScale = 0.5` → 3초간 게임 전체 절반 속도
- [ ] 구름 궤도·장애물·중력 모두 느려짐, 조작 여유 확보
- [ ] 발동/종료 시 비주얼 연출 (화면 가장자리 슬로우 이펙트)
- [ ] 타임 슬로우 중 HUD 타이머 표시

#### 🧊 구름 동결 (부스터 — 미구현)
- [ ] 게임 시작 전 부스터 슬롯에서 선택
- [ ] 발동 시 모든 구름의 `orbitSpeed`를 임시 0으로 설정 → 4초 후 복원
- [ ] 구름 동결 중 구름에 얼음 비주얼 오버레이

#### 🦅 더블 점프 (패시브 — 미구현)
- [ ] 게임 시작 전 선택 패시브 슬롯에 추가
- [ ] `JumpSystem`에 `remainingAirJumps` 카운터 추가
- [ ] 공중에서 한 번 더 점프 가능, 착지 시 카운터 리셋
- [ ] 공중 점프 가능 상태 HUD 표시 (아이콘 점등)

#### 💫 구름 소환 (패시브 — 미구현)
- [ ] 게임 시작 전 선택 패시브 슬롯에 추가
- [ ] 쿨타임마다 플레이어 발 아래 임시 구름 1개 소환 (3~4초 후 낙하)
- [ ] 추락 직전 긴급 발판 용도
- [ ] 임시 구름 시각 차별화 (점선 테두리 등)

#### 🎺 새떼 퇴치 나팔 (부스터 — 미구현)
- [ ] 게임 시작 전 부스터 슬롯에서 선택
- [ ] 발동 시 화면의 새떼 즉시 소멸 + 일정 시간 새떼 스폰 억제
- [ ] 기반: `ObstacleSystem.clearAll()` + 다음 플록 스폰 타이머 지연

#### 💀 부활 (광고 / 아이템 — 미구현)
> 추락으로 게임오버 발생 시 팝업을 띄워 부활 방법 선택
- [ ] 게임오버 직후 `triggerGameOver()` 분기에서 부활 가능 여부 체크
- [ ] 부활 팝업 UI 구현
  - **[광고 보고 부활]** — AdMob 광고 시청 후 부활 (무료, 1게임 1회)
  - **[아이템 사용 부활]** — 상점에서 구매한 부활 아이템 소비 (코인 or IAP)
  - **[포기]** — 결과 화면으로 이동
- [ ] 부활 처리: 가장 가까운 구름 위로 순간이동 + 방어막 1개 지급
- [ ] 부활은 1게임 1회로 제한 (광고·아이템 모두 해당)
- [ ] 부활 후 최고점수 갱신 제한 여부 결정 필요 (추후 밸런스 검토)

#### 기타
- [ ] **콤보 보너스**: 연속 착지 시 점수 배율 증가

---

### 🏆 성취감 시스템 (PROGRESSION_DESIGN.md 참고)

> 세 가지 방향성 전체 설계: [`PROGRESSION_DESIGN.md`](./PROGRESSION_DESIGN.md)

#### 3안: 콤보 시스템 + 코인 배율 (P1 — 구현 우선)

- [ ] `ScoreSystem`에 `comboCount`, `maxCombo` 필드 추가
- [ ] 착지 성공(`onLand`) 시 콤보 증가, 낙사(`triggerGameOver`) 시 리셋
- [ ] 콤보 단계별 코인 배율 적용 (3콤보 ×2, 5콤보 ×3, 10콤보 ×5, 20콤보 ×8)
- [ ] `GameHud`에 콤보 카운터 UI 추가 (콤보 숫자 + 단계별 글로우 이펙트)
- [ ] 고콤보 구간 화면 연출 (배경 색상 변화 또는 파티클)
- [ ] `ResultPanel`에 "최고 콤보: N" 표시 추가

#### 2안: 마일스톤 해금 시스템 (P1 — 데이터 수집부터)

- [ ] `SaveManager`에 누적 통계 필드 추가
  - `totalJumpsAllTime`: 전체 누적 점프 수 (현재 `totalJumps` 활용 가능)
  - `lifetimeCoins`: 전체 누적 코인 획득량
  - `unlockedMilestones: string[]`: 달성한 마일스톤 ID 목록
- [ ] `MilestoneManager` 신규 생성
  - 마일스톤 정의 목록 (조건 + 해금 내용)
  - 게임 종료 시 조건 체크 + 신규 달성 마일스톤 처리
  - 해금 내용 적용 (스킨 추가, 업그레이드 슬롯 해금 등)
- [ ] 마일스톤 달성 연출 UI (결과 화면 또는 별도 오버레이)
  - 팡파레 이펙트 + 해금 내용 표시 팝업
- [ ] 타이틀 또는 결과 화면에 "다음 목표" 표시 컴포넌트 추가

#### 1안: 영구 패시브 업그레이드 (P2 — 상점 연동)

- [ ] `SaveManager`에 업그레이드 단계 저장 필드 추가
  - `upgradeMagnetDuration`: 0~3 (단계)
  - `upgradeRocketDuration`: 0~2
  - `upgradeCoinMultiplier`: 0~3
  - `upgradeShieldDurability`: 0~2
  - `upgradeLandingRange`: 0~2
- [ ] 각 시스템에 업그레이드 단계 반영
  - `MagnetSystem`: 지속시간을 단계별 값으로 참조
  - `ShieldSystem`: 내구도를 단계별 값으로 참조
  - `ScoreSystem`: 코인 배율에 업그레이드 배율 적용
  - `CollisionSystem`: 착지 판정 범위에 업그레이드 보정 적용
- [ ] 상점 "업그레이드" 탭 UI 구현
  - 현재 단계 표시 + 다음 단계 비용 + 구매 버튼
  - 마일스톤 미달성 시 잠금 표시
- [ ] 마일스톤 해금과 연동: 슬롯 해금 여부에 따라 구매 가능 여부 분기

### 기타 확장
- [ ] **구름섬 패턴 다양화**: 손으로 제작한 패턴 세트 도입
- [ ] **캐릭터 스킨**: 다른 종류의 강아지, 고양이 등

### 메타 UI 아이콘 (구조 완료, 기능 미구현)
> `MetaIconPanel` 구조는 준비됨. `GameScene.setupUILayers()` 에서 `rightMetaPanel.addIcon()` 으로 추가.
- [x] 상점 진입 아이콘 (우측 패널 1번째) — 임시 그래픽, 추후 스프라이트 교체 예정
- [x] **룰렛 진입 아이콘 (우측 패널 2번째)** — 무료 스핀 시 FREE 뱃지 표시, RouletteScene 연결
- [x] **미션 진입 아이콘 (우측 패널 3번째)** — 수령 가능 시 빨간 뱃지 표시, MissionPopup 연결
- [ ] 출석 진입 아이콘 (우측 패널 4번째)
- [ ] 좌측 패널 아이콘 구성 결정 (현재 비워둠)

---

### 🎯 미션 시스템 (MissionPopup) — 전체 완료 ✅

#### 구현 완료
- [x] `src/config/missions.ts` — 착지 미션 6단계 / 점수 미션 4단계 정의, `stage` 필드 + `MISSION_TYPE_ID` 상수 추가
- [x] `SaveManager`에 `bestLandings`, `claimedMissions` 필드 추가
- [x] `SaveManager`에 `claimMission()`, `hasPendingMissions()`, `getClaimedMissions()`, `resetClaimedMissions()` 메서드 추가
- [x] `MissionPopup` UI — 착지/점수 탭 전환, 진행 바, 수령 버튼, 완료 표시
- [x] 진행 중 행 / 수령 가능 행 / 완료 행 각 상태별 보상 표시 (`🪙 N`)
- [x] 메인 화면 미션 아이콘 + 수령 가능 시 빨간 뱃지 표시
- [x] CheatPopup에 '미션 초기화' 버튼 추가 (localStorage + DB 동시 초기화)

#### DB 연동 (Supabase)
- [x] `profiles` 테이블에 `best_landings` 컬럼 추가
- [x] `claimed_missions` 테이블 신규 생성 (`(user_id, mission_type, mission_id)` 복합 PK)
- [x] `claim_mission()` / `claim_all_missions()` / `get_claimed_missions()` / `reset_claimed_missions()` RPC 구현
- [x] `MissionService` 신규 생성 (`src/services/MissionService.ts`)
- [x] `MissionPopup`에 Supabase 백그라운드 동기화 연결 (로컬 우선, 실패 시 무중단)
- [x] `database.types.ts` — `claimed_missions` 테이블·`best_landings`·미션 RPC 타입 반영

#### 한 번에 획득 기능
- [x] 수령 가능한 미션이 2개 이상일 때 팝업 하단에 "모두 수령" 버튼 표시 (탭별 독립 판단)
- [x] 버튼 클릭 시 현재 탭의 미수령 완료 미션 전부 일괄 처리 + 총 보상 합산 지급
- [x] 일괄 수령 후 각 행 UI 상태 일괄 갱신 (버튼 숨김 → 완료 표시 전환)
- [x] DB — `claim_all_missions()` RPC 단일 트랜잭션으로 구현 완료 (UI 연결 시 사용 가능)

---

### 🎡 룰렛 (RouletteScene) — 구현 완료

#### 밸런스 설계 메모
> **다이아몬드 비용 및 추가 횟수 검토**
>
> 원안(2다이아, 최대 3회 추가)의 문제: 하루 최대 6 다이아몬드 지출이 요구되어 초반 플레이어에겐 부담이 크다. 다이아몬드 주 수급처가 IAP 또는 일부 미션에 한정된다면 과도한 소모량이 될 수 있다.
>
> **권장안: 비용 점증형 (총 3회 추가 유지, 단 비용 차등)**
> - 무료: 1회
> - 1회 추가 = 2 다이아몬드
> - 2회 추가 = 3 다이아몬드
> - 3회 추가 = 5 다이아몬드
> - 일일 최대 총 10 다이아몬드 — 과금 의지 있는 유저는 더 많이, 가벼운 유저는 1~2회 추가로 자연 제한
>
> 대안이 필요하다면 **단순안(2다이아 고정, 최대 2회 추가)** 으로 단순화 가능.

> **보상 테이블 (8-슬롯 기준 / 코인 환율 1다이아=150코인)**
>
> | # | 보상 | 확률 | 코인 환산 |
> |---|------|------|-----------|
> | 1 | 코인 30개 | 25% | 30 |
> | 2 | 코인 60개 | 18% | 60 |
> | 3 | 코인 100개 | 13% | 100 |
> | 4 | 방어막 1회 | 15% | ≈150 |
> | 5 | 자석 1회 | 12% | ≈120 |
> | 6 | 코인 200개 | 8% | 200 |
> | 7 | 다이아몬드 1개 | 6% | 150 |
> | 8 | 다이아몬드 3개 | 3% | 450 |
>
> 기댓값 ≈ 107코인/회. 무료 스핀 기준 기대치로 적절하며, 다이아몬드 당첨(6%+3%)이 흥미 유인 역할.
> 아이템(방어막·자석) 확률 합계 27% — 아이템을 자연스럽게 습득하는 주요 경로로 기능.

#### 저장 / 상태
- [x] `SaveManager`에 `lastRouletteDate: string` (YYYY-MM-DD) 필드 추가
- [x] `SaveManager`에 `roulettePaidSpinsToday: number` 필드 추가 (날짜 바뀌면 리셋)
- [x] `SaveManager`에 `canFreeRoulette()`, `recordFreeRoulette()`, `spendPaidRoulette()` 메서드 추가
- [x] `SaveManager`에 보상 지급 메서드 추가: `addShieldItem()`, `addMagnetItem()` (수량 관리)
- [x] `SaveManager`에 `resetRouletteState()` 추가 (테스트용 초기화)

#### RouletteScene 구현
- [x] `RouletteScene.ts` 생성 (플레이스홀더 — 배경, 휠 그래픽, 스핀 현황, 닫기 버튼)
- [x] 8칸 룰렛 휠 레이아웃 렌더링 (Phaser Graphics / Container)
- [x] 슬롯별 아이콘 + 보상 텍스트 표시 (코인/다이아/아이템 구분 색상)
- [x] 스핀 버튼 UI — 무료 가능 시 "무료 스핀!" / 소진 시 "💎 N" 표시 (점증 비용 반영)
- [x] 스핀 애니메이션: 가속 → 감속 → 당첨 슬롯 정렬 (Phaser Tweens)
- [x] 당첨 연출: 강조 이펙트 + 보상 팝업 (획득 내용 텍스트)
- [x] 추가 스핀 불가 시 안내 문구 ("오늘은 더 이상 스핀할 수 없어요. 내일 다시 도전하세요!")
- [x] 닫기 버튼 → GameScene resume
- [x] [TEST] 무료 룰렛 초기화 버튼 (로컬 + DB 동시 초기화)

#### 진입 연결
- [x] `GameScene.setupUILayers()` 에서 룰렛 아이콘을 `rightMetaPanel.addIcon()` 으로 추가
- [x] 아이콘 탭 시 GameScene pause + RouletteScene launch
- [x] 무료 스핀 잔여 시 아이콘에 "FREE" 뱃지 표시

#### DB 연동 (Supabase)
- [x] `profiles` 테이블에 `last_roulette_date`, `roulette_paid_spins_today` 컬럼 추가
- [x] `player_inventory` 테이블 신규 생성 (아이템 수량 관리, 확장 가능 구조)
- [x] `record_free_roulette()`, `spend_paid_roulette()`, `add_item()` RPC 구현
- [x] `database.types.ts` 신규 테이블·컬럼·RPC 타입 반영
- [x] `InventoryService` 신규 생성 (`add_item` RPC 래핑, 인벤토리 조회)
- [x] `ProfileService`에 룰렛 RPC 메서드 추가
- [x] `RouletteScene`에 Supabase 백그라운드 동기화 연결 (로컬 우선, 실패 시 무중단)

---

## P3 — 수익화 & 배포

- [x] Cloudflare Workers 배포 환경 구성 (wrangler.toml + npm 의존성 정리)
- [ ] Google AdMob 광고 연동
- [ ] 인앱 구매 (스킨, 광고 제거)
- [ ] 리더보드 (온라인 최고 점수 랭킹)
- [ ] 소셜 공유 (결과 화면에서 점수 공유)
- [ ] Google Play Store 출시
- [ ] Apple App Store 출시
- [ ] 푸시 알림 (일일 도전 등)

---

## 기술 부채 / 리팩터링 예정

- [x] `@typescript-eslint` v7 → v8 업그레이드 (ESLint 9 호환)
- [ ] `eslint.config.js` `@eslint/js` import 방식 정리
- [ ] `GameScene` 디버그 패턴 텍스트 제거 (출시 전)
- [ ] `CloudIslandConfig` 기반 패턴 에디터 또는 JSON 레벨 파일
- [ ] 성능 프로파일링 (저사양 모바일 기기 대응)
