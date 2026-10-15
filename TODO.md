# TODO

- `GameScene.triggerGameOver`: `_delay` 파라미터가 내부에서 무시되고 항상 600ms 하드코딩됨 — Dramatic 연출 커밋(b64bfac)에서 도입, 의도적 변경인지 확인 필요
- `GameScene.handleLand`: `_physicsGravity=true + isDead=true` 상태에서 별 구름 착지 시 `startRocketMode()` early return이 physicsGravity 복구 블록보다 먼저 실행됨 — `startRocketMode()` 내부에서 `isDead=false`/`_physicsGravity=false`를 처리하는지 검증 필요
