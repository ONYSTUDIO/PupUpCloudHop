---
name: mission-design
description: 미션 후보를 설계하고 보상 총량과 문서 정합성을 검증한다. 일일·주간·고정 미션 추가/수정 시 사용.
---
# mission-design

1. `src/config/missions.ts`, `docs/RETENTION_DESIGN.md`, `docs/ECONOMY_DESIGN.md` 를 읽는다.
2. 후보를 "id, 유형, 목표, 보상, 예상 달성 소요(판 수)" 표로 만든다. 달성 소요는 `docs/balance/` 의 성공률 기준으로 추정한다.
3. 보상 총량이 ECONOMY_DESIGN 의 기준을 넘지 않는지 합산한다.
4. DB 영향 확인: `claimed_missions` 의 mission_type/stage 와 충돌하지 않는지, 새 유형이면 `data-backend` 필요 여부.
5. 변경안만 보고한다. 확정되면 `/sync-config` 로 넘긴다.
