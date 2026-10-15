---
name: balance-check
description: 재화·보상 변경안의 영향을 시뮬레이션한다. 코인 보상/가격을 바꾸거나 "며칠 걸려?" 같은 도달 기간 질문에 사용.
---
# balance-check

1. `docs/ECONOMY_DESIGN.md` 와 `src/config/` (missions, constants) 에서 현재 획득·소비 수치를 읽는다.
2. 변경안(예: 미션 보상 +20%)을 입력 파라미터로 정리한다.
3. `scripts/sim/economy.mjs` 로 시뮬한다 (없으면 새로 만든다). 시나리오: 신규 / 하루 3판 / 하루 10판 유저, 30일.
4. 결과 표: 일/주/월 코인 획득량, 주요 구매(스킨·업그레이드)까지 도달 일수, 변경 전후 비교.
5. 목표 범위(ECONOMY_DESIGN 의 밸런스 기준)를 벗어나면 이유와 대안을 같이 적는다.
6. docs 와 config 는 수정하지 않고 변경안만 보고한다.
