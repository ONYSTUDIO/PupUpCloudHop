---
name: verify
description: 빌드·린트·스모크 테스트를 한 번에 실행하고 결과를 요약한다. 변경 후 검증이 필요할 때 사용.
---
# verify

1. `npm run build` 와 `npm run lint` 실행.
2. `tests/` 가 있으면 `npx playwright test`, 없으면 "스모크 테스트 없음" 으로 보고하고 만들지 여부를 묻는다.
3. 결과 요약: 통과/실패/건너뜀을 각각 적고, 실패는 에러 원문 일부와 file:line 을 붙인다.
4. `src/` 는 수정하지 않는다.
