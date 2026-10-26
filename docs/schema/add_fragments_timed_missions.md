# Schema: fragments 컬럼 + claimed_timed_missions 마이그레이션

일일/주간 미션 시스템 도입과 아이템 조각(fragments) 재화 추가에 따른 DB 변경.  
클라이언트(`SaveManager`, `missions.ts`)에는 이미 구현되어 있으며, 이 마이그레이션으로 DB 동기화를 활성화한다.

---

## 변경 배경

- `SaveData`에 `fragments`, `dailyMissionClaimed`, `weeklyMissionClaimed` 등 신규 필드가 추가됨
- `SaveManager`에 `claimDailyMission()`, `claimWeeklyMission()`, `addFragments()` 메서드가 구현됨
- 현재는 localStorage 전용으로 동작. 이 마이그레이션 적용 후 DB 동기화 가능

---

## 1. profiles.fragments 컬럼 추가

| 컬럼 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `fragments` | integer | 0 | 아이템 조각 재화. 미션·출석·아이템 픽업으로 획득. 0 이상 제약 |

클라이언트의 `SaveData.fragments` 와 1:1 대응.

---

## 2. claimed_timed_missions 테이블

일일/주간 미션 수령 내역을 저장한다.  
미션 정의(목표값·보상)는 클라이언트(`src/config/missions.ts`)에서 관리하며, DB는 "어떤 기간에 어떤 미션을 수령했는가"만 저장한다.

### 테이블 구조

| 컬럼 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `user_id` | uuid | — | `profiles(id)` FK, 복합 PK의 일부 |
| `mission_id` | text | — | 미션 ID 문자열 (e.g. `'daily_land_10'`, `'weekly_land_50'`), 복합 PK의 일부 |
| `period_key` | text | — | 기간 키, 복합 PK의 일부. 일일: `'YYYY-MM-DD'`, 주간: 해당 주 월요일 날짜 `'YYYY-MM-DD'` |
| `claimed_at` | timestamptz | now() | 수령 일시 |

### 복합 PK

```
(user_id, mission_id, period_key)
```

같은 기간에 동일 미션 중복 수령 불가. 날짜/기간이 바뀌면 새로운 `period_key`로 삽입되므로 자연스럽게 만료 처리된다. 별도 TTL·삭제 작업 불필요.

### period_key 사용 방법

| 미션 종류 | period_key 형식 | 예시 |
|-----------|----------------|------|
| 일일 (daily) | 오늘 날짜 `'YYYY-MM-DD'` | `'2026-10-26'` |
| 주간 (weekly) | 해당 주 월요일 날짜 `'YYYY-MM-DD'` | `'2026-10-26'` (월요일이 10/26인 주) |

클라이언트의 `SaveManager.todayString()` / `SaveManager.mondayString()` 반환값과 동일한 포맷이다.

### RLS 정책

| 정책 | 허용 |
|------|------|
| select | 본인 row만 (`auth.uid() = user_id`) |
| insert | RPC에서만 (security definer) |
| delete | RPC에서만 (security definer, 개발·테스트용) |

> 클라이언트 직접 INSERT를 허용하면 period_key를 임의로 조작해 보상을 중복 수령할 수 있으므로 RPC 경유만 허용한다.

### 인덱스

| 인덱스명 | 컬럼 | 용도 |
|----------|------|------|
| `idx_claimed_timed_missions_period` | `(user_id, period_key)` | 특정 기간의 수령 목록 조회 성능 |

---

## 3. RPC 함수

### add_fragments(amount int) → integer

`profiles.fragments`를 동시성 안전하게 증감.

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `amount` | integer | 증감량 (양수=획득, 음수=소비). 잔량 부족 시 check 제약 에러 |

반환값: 변경 후 fragments 총량.

---

### claim_timed_mission(...) → jsonb

일일 또는 주간 미션 단일 수령. 보상 지급까지 원자적으로 처리.

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `p_mission_id` | text | 미션 ID (e.g. `'daily_land_10'`) |
| `p_period_key` | text | 기간 키. 일일: 오늘 날짜, 주간: 이번 주 월요일 날짜 |
| `p_coin_reward` | integer | 코인 보상량 (0 가능) |
| `p_fragment_reward` | integer | 조각 보상량 (0 가능) |
| `p_revival_reward` | integer | 부활권 보상량 (0 또는 1) |

반환 jsonb:

```json
{
  "coins": 20,
  "fragments": 3,
  "revivals": 0,
  "already_claimed": false
}
```

- `already_claimed: true` 이면 보상 미지급 (모든 값 0). 중복 수령 시도 시에도 에러 없이 반환.
- 부활권은 `player_inventory` 테이블에 upsert.

---

### get_claimed_timed_missions(p_period_key text) → jsonb

특정 기간에 수령한 미션 ID 목록 조회.

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `p_period_key` | text | 조회할 기간 키 |

반환 jsonb: 수령한 mission_id 문자열 배열. e.g. `["daily_land_10", "daily_score_20"]`  
수령 내역이 없으면 `[]` 반환.

---

### reset_timed_missions(p_period_key text) → void

[개발·테스트 전용] 특정 기간의 수령 내역 삭제.

---

### reset_all_timed_missions() → void

[개발·테스트 전용] 본인의 모든 기간 미션 수령 내역 삭제.

---

## 4. 전체 SQL

Supabase SQL Editor에 바로 붙여넣어 실행할 수 있는 완전한 형태.

```sql
-- ============================================================
-- 1. profiles에 fragments 컬럼 추가
-- ============================================================
alter table public.profiles
  add column fragments integer not null default 0 check (fragments >= 0);

comment on column public.profiles.fragments is
  '아이템 조각 재화. 미션·출석·인게임 아이템 픽업으로 획득. 0 이상 제약';

-- ============================================================
-- 2. add_fragments RPC — fragments 증감 (동시성 안전)
--    음수 amount로 소비 처리 가능.
--    잔량 부족 시 check 제약(>= 0)으로 에러 발생.
-- ============================================================
create or replace function public.add_fragments(amount integer)
returns integer
language plpgsql security definer
as $$
declare new_fragments integer;
begin
  update public.profiles
  set fragments = fragments + amount
  where id = auth.uid()
  returning fragments into new_fragments;
  return new_fragments;
end;
$$;

-- ============================================================
-- 3. claimed_timed_missions 테이블 — 일일/주간 미션 수령 내역
-- ============================================================
create table public.claimed_timed_missions (
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  mission_id  text        not null,  -- e.g. 'daily_land_10', 'weekly_land_50'
  period_key  text        not null,  -- 일일: 'YYYY-MM-DD', 주간: 해당 주 월요일 날짜
  claimed_at  timestamptz not null default now(),

  primary key (user_id, mission_id, period_key)
);

comment on column public.claimed_timed_missions.mission_id is
  '클라이언트 MissionDef.id 값. e.g. daily_land_10, weekly_land_50';
comment on column public.claimed_timed_missions.period_key is
  '일일: 오늘 날짜 YYYY-MM-DD, 주간: 이번 주 월요일 날짜 YYYY-MM-DD';

-- RLS 활성화
alter table public.claimed_timed_missions enable row level security;

create policy "Users can view own timed mission claims"
  on public.claimed_timed_missions for select
  using (auth.uid() = user_id);

-- period_key 단독 조회용 인덱스 (특정 날짜의 수령 목록 조회)
create index idx_claimed_timed_missions_period
  on public.claimed_timed_missions (user_id, period_key);

-- ============================================================
-- 4. claim_timed_mission RPC — 일일/주간 미션 단일 수령
--    ON CONFLICT DO NOTHING으로 중복 수령 방지.
--    보상(코인·조각·부활권)을 원자적으로 지급.
-- ============================================================
create or replace function public.claim_timed_mission(
  p_mission_id      text,
  p_period_key      text,
  p_coin_reward     integer,
  p_fragment_reward integer,
  p_revival_reward  integer
)
returns jsonb
language plpgsql security definer
as $$
declare
  v_inserted integer;
begin
  insert into public.claimed_timed_missions (user_id, mission_id, period_key)
  values (auth.uid(), p_mission_id, p_period_key)
  on conflict (user_id, mission_id, period_key) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return jsonb_build_object('coins', 0, 'fragments', 0, 'revivals', 0, 'already_claimed', true);
  end if;

  -- 코인 지급
  if p_coin_reward > 0 then
    update public.profiles set coins = coins + p_coin_reward where id = auth.uid();
  end if;

  -- 조각 지급
  if p_fragment_reward > 0 then
    update public.profiles set fragments = fragments + p_fragment_reward where id = auth.uid();
  end if;

  -- 부활권 지급 (player_inventory upsert)
  if p_revival_reward > 0 then
    insert into public.player_inventory (user_id, item_type, quantity)
    values (auth.uid(), 'revival', p_revival_reward)
    on conflict (user_id, item_type)
    do update set quantity = player_inventory.quantity + p_revival_reward;
  end if;

  return jsonb_build_object(
    'coins',           p_coin_reward,
    'fragments',       p_fragment_reward,
    'revivals',        p_revival_reward,
    'already_claimed', false
  );
end;
$$;

-- ============================================================
-- 5. get_claimed_timed_missions RPC — 특정 기간 수령 목록 조회
--    반환: ["daily_land_10", "daily_score_20", ...]
--    수령 내역 없으면 '[]' 반환
-- ============================================================
create or replace function public.get_claimed_timed_missions(p_period_key text)
returns jsonb
language plpgsql security definer
as $$
declare v_result jsonb;
begin
  select coalesce(jsonb_agg(mission_id), '[]'::jsonb)
  into v_result
  from public.claimed_timed_missions
  where user_id = auth.uid() and period_key = p_period_key;
  return v_result;
end;
$$;

-- ============================================================
-- 6. reset_timed_missions RPC — [개발·테스트 전용] 특정 기간 초기화
--    운영 환경에서는 DROP하거나 admin 전용으로 제한할 것.
-- ============================================================
create or replace function public.reset_timed_missions(p_period_key text)
returns void
language plpgsql security definer
as $$
begin
  delete from public.claimed_timed_missions
  where user_id = auth.uid() and period_key = p_period_key;
end;
$$;

-- ============================================================
-- 7. reset_all_timed_missions RPC — [개발·테스트 전용] 전체 초기화
-- ============================================================
create or replace function public.reset_all_timed_missions()
returns void
language plpgsql security definer
as $$
begin
  delete from public.claimed_timed_missions where user_id = auth.uid();
end;
$$;
```

---

## 5. 적용 순서 및 롤백 방법

### 적용 순서

1. `profiles` 테이블에 `fragments` 컬럼 추가 및 `add_fragments` RPC 생성 (1~2번 SQL)
2. `claimed_timed_missions` 테이블 생성, RLS 활성화, 인덱스 생성 (3번 SQL)
3. RPC 함수 4개 생성 (4~7번 SQL)

> `claim_timed_mission`이 `player_inventory`를 참조하므로 `player_inventory` 테이블이 먼저 존재해야 한다. (이미 적용되어 있음 — `player_inventory.md` 참고)

### 롤백 방법

아래 SQL을 역순으로 실행한다.

```sql
-- RPC 제거
drop function if exists public.reset_all_timed_missions();
drop function if exists public.reset_timed_missions(text);
drop function if exists public.get_claimed_timed_missions(text);
drop function if exists public.claim_timed_mission(text, text, integer, integer, integer);
drop function if exists public.add_fragments(integer);

-- 테이블 제거
drop table if exists public.claimed_timed_missions;

-- profiles 컬럼 제거 (데이터 손실 주의)
alter table public.profiles drop column if exists fragments;
```

---

## 6. 클라이언트 연동 흐름

```
MissionPopup 열기 (일일)
  └─ SaveManager.checkAndResetDailyMissions()   ← 날짜 바뀌면 로컬 초기화
  └─ get_claimed_timed_missions(today)           ← DB에서 오늘 수령 목록 조회
       → ["daily_land_10", ...] 수신
       → dailyMissionClaimed 와 비교해 최신화

수령 버튼 클릭 (일일 미션 m)
  └─ claim_timed_mission(
       p_mission_id:      m.id,         -- e.g. 'daily_land_10'
       p_period_key:      todayString(), -- e.g. '2026-10-26'
       p_coin_reward:     m.coinReward,
       p_fragment_reward: m.fragmentReward,
       p_revival_reward:  m.revivalReward
     )
  └─ already_claimed=false 이면 SaveManager.claimDailyMission(m.id) 로 로컬 동기화

MissionPopup 열기 (주간)
  └─ SaveManager.checkAndResetWeeklyMissions()  ← 주 바뀌면 로컬 초기화
  └─ get_claimed_timed_missions(mondayString())  ← DB에서 이번 주 수령 목록 조회

수령 버튼 클릭 (주간 미션 m)
  └─ claim_timed_mission(
       p_mission_id:      m.id,            -- e.g. 'weekly_land_50'
       p_period_key:      mondayString(),   -- e.g. '2026-10-21' (이번 주 월요일)
       p_coin_reward:     m.coinReward,
       p_fragment_reward: m.fragmentReward,
       p_revival_reward:  m.revivalReward
     )
  └─ already_claimed=false 이면 SaveManager.claimWeeklyMission(m.id) 로 로컬 동기화

[테스트] 오늘 일일 미션 초기화 (CheatPopup)
  └─ SaveManager.resetDailyMissions()           ← 로컬 lastDailyReset 초기화
  └─ reset_timed_missions(todayString())         ← DB 오늘 수령 내역 삭제

[테스트] 전체 기간 미션 초기화
  └─ reset_all_timed_missions()
```

### 보상 검증 원칙

- 보상량(coinReward, fragmentReward, revivalReward)은 **클라이언트에서 전달**하지만, `claim_timed_mission` 자체는 중복 수령만 방지할 뿐 값 자체를 검증하지 않는다.
- 보상 조작을 막으려면 향후 RPC 내부에서 mission_id로 정해진 보상값을 서버 상수로 조회하도록 개선해야 한다. 현재는 클라이언트 신뢰 모델.

---

## 7. 관련 문서

- [profiles 테이블 전체 스키마](./profiles.md)
- [player_inventory 테이블](./player_inventory.md)
- [기존 permanent 미션 수령 테이블](./claimed_missions.md)
- [재화 시스템 설계](../ECONOMY_DESIGN.md)
- [미션 밸런스 설계](../BALANCE_DESIGN.md)
