# CLAUDE.md — 안 떨어질개: 구름섬 점프 (Pup Up! Cloud Hop)

1인 개발 하이퍼캐주얼 모바일 게임. Phaser 3 + TypeScript + Vite, Capacitor, Supabase. 세로형 1080x1920.
메인 세션은 **오케스트레이터**로서 요청을 아래 서브에이전트에 배분하고 결과를 합친다.

## 명령어
- `npm run dev` / `npm run build` (= `tsc && vite build`) / `npm run lint`
- 경로 별칭: `@config/*`, `@scenes/*`, `@systems/*`, `@managers/*`, `@ui/*`, `@services/*`, `@lib/*`, `@utils/*`, `@game-types/*`

## 폴더
- `src/config/` 상수·수치의 단일 출처 (constants, difficultyConfig, gameplayConfig, missions, uiLayout)
- `src/scenes|systems|entities|ui|managers|services|lib|utils/`
- `docs/` 기획 문서, `docs/schema/` DB 스키마 문서
- `tests/` QA 전용 (Playwright)

## 문서 우선순위 (충돌 시)
1. `docs/ECONOMY_DESIGN.md` (재화·상점·보상 구조의 기준)
2. 개별 설계 문서 (GAME_RULES, RETENTION, PROGRESSION, BALANCE, DIFFICULTY_BALANCE_PROPOSAL)
3. `CURRENCY_DESIGN`, `SHOP_DESIGN`은 ECONOMY_DESIGN 으로 대체되는 참고용

## 에이전트 배분
| 요청 | 담당 | 비고 |
|---|---|---|
| 재화 밸런스, 미션, 아이템·룰렛 확률, 문서 충돌 | `design` | `docs/` 만 수정 |
| 구현, 리팩터링, 상수 정리, 사이드 이슈 점검 | `dev` | `src/` |
| 빌드·린트·스모크 테스트, 버그 재현 | `qa` | `src/` 수정 금지 |
| Supabase 스키마·마이그레이션, 저장 동기화 | `data-backend` | 실행은 사용자 |
| Capacitor, 광고·결제, 스토어 출시 | `release` | Phase 3 |

## 작업 흐름
기획 변경: `design` 변경안·시뮬 → **사용자 확인** → `design` 이 docs 반영 → `dev` 가 `config/` 반영 → `qa` 검증.
기획에 대한 의견·토론은 메인 세션과 대화로 진행하고, 계산·조사만 `design` 에 맡긴다. 서브에이전트는 사용자에게 되묻지 못하므로 결정이 필요한 지점은 메인 세션이 먼저 정리한다.

## 규칙
- 수치는 `src/config/` 에만 둔다. 컴포넌트·씬에 매직넘버 새로 추가 금지.
- 점프·착지·인게임 픽업 등 기존 게임플레이 로직은 요청 없이 변경하지 않는다.
- DB 마이그레이션 실행, 키·시크릿 등록, 스토어 제출은 파일/체크리스트까지만 만들고 실행은 사용자가 한다.
- `.env` 는 커밋하지 않는다. 필요한 키는 `.env.example` 에 이름만 적는다.
- 커밋 전 `npm run build` 와 `npm run lint` 통과 확인.
- 기획 수치를 바꾸는 커밋 메시지에는 근거 문서 경로를 적는다.
