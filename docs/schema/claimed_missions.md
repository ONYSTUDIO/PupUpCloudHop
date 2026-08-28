# Schema: claimed_missions + profiles migration

미션 수령 내역을 저장하는 테이블과 `profiles`에 `best_landings` 컬럼을 추가하는 마이그레이션.  
미션 정의(목표값·보상)는 클라이언트(`src/config/missions.ts`)에서 관리하며, DB는 "어떤 미션을 언제 수령했는가"만 저장한다.

---

## 1. profiles 마이그레이션 — best_landings 컬럼 추가

| 컬럼 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `best_landings` | integer | 0 | 단일 판 최고 착지 횟수 |

---

## 2. claimed_missions 테이블

수령한 미션을 개별 행으로 저장한다. 순서 무관 개별 수령 방식 (B 방식).

| 컬럼 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `user_id` | uuid | — | `profiles(id)` FK, PK의 일부 |
| `mission_type` | smallint | — | 미션 종류 (1 = 착지, 2 = 점수), PK의 일부 |
| `mission_id` | integer | — | 타입 내 단계 순번 (1, 2, 3, ...), PK의 일부 |
| `claimed_at` | timestamptz | now() | 수령 일시 |

### mission_type 값 정의

| 값 | 미션 종류 | 클라이언트 상수 |
|----|-----------|----------------|
| 1  | 착지 미션 | `MISSION_TYPE_ID.landing` |
| 2  | 점수 미션 | `MISSION_TYPE_ID.score` |

### mission_id (stage) 매핑

| mission_type | mission_id | 목표 | 클라이언트 id |
|-------------|-----------|------|--------------|
| 1 (착지) | 1 | 5회 | `land_5` |
| 1 (착지) | 2 | 10회 | `land_10` |
| 1 (착지) | 3 | 20회 | `land_20` |
| 1 (착지) | 4 | 30회 | `land_30` |
| 1 (착지) | 5 | 50회 | `land_50` |
| 1 (착지) | 6 | 100회 | `land_100` |
| 2 (점수) | 1 | 20점 | `score_20` |
| 2 (점수) | 2 | 60점 | `score_60` |
| 2 (점수) | 3 | 120점 | `score_120` |
| 2 (점수) | 4 | 200점 | `score_200` |

> `(user_id, mission_type, mission_id)` 복합 PK — 동일 미션 중복 수령 불가.  
> `mission_type` 분리로 타입별 조회 시 인덱스를 효율적으로 활용 가능.

---

## RLS 정책

| 정책 | 허용 |
|------|------|
| select | 본인 row만 (`auth.uid() = user_id`) |
| insert | RPC에서만 (security definer) |
| delete | RPC에서만 (security definer, 개발·테스트용) |

---

## RPC 함수

| 함수 | 반환 | 설명 |
|------|------|------|
| `claim_mission(mission_type, mission_id, coin_reward)` | integer | 단일 미션 수령. 이미 수령했으면 0, 신규면 코인 지급 후 coin_reward 반환 |
| `claim_all_missions(missions)` | integer | 수령 가능한 미션 일괄 처리. 총 지급 코인 반환 |
| `get_claimed_missions()` | jsonb | 수령 완료 미션 목록 `[{mission_type, mission_id}, ...]` 반환 |
| `reset_claimed_missions()` | void | **[개발·테스트 전용]** 수령 내역 전체 삭제 |

---

## SQL

```sql
-- ============================================================
-- 1. profiles에 best_landings 컬럼 추가
-- ============================================================
alter table public.profiles
  add column best_landings integer not null default 0;

comment on column public.profiles.best_landings is
  '단일 판 최고 착지 횟수. 착지 미션 달성 판별에 사용';

-- ============================================================
-- 2. claimed_missions 테이블
-- ============================================================
create table public.claimed_missions (
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  mission_type smallint    not null,  -- 1=착지, 2=점수
  mission_id   integer     not null,  -- 타입 내 단계 순번 (1, 2, 3, ...)
  claimed_at   timestamptz not null default now(),

  primary key (user_id, mission_type, mission_id),
  check (mission_type in (1, 2)),
  check (mission_id >= 1)
);

comment on column public.claimed_missions.mission_type is '1=착지 미션, 2=점수 미션';
comment on column public.claimed_missions.mission_id   is '타입 내 단계 순번. 클라이언트 MissionDef.stage 값과 일치';

-- RLS 활성화
alter table public.claimed_missions enable row level security;

create policy "Users can view own claimed missions"
  on public.claimed_missions for select
  using (auth.uid() = user_id);

-- mission_type 단독 조회용 인덱스
create index idx_claimed_missions_type
  on public.claimed_missions (user_id, mission_type);

-- ============================================================
-- 3. RPC: 단일 미션 수령
--    이미 수령한 미션이면 0 반환 (ON CONFLICT DO NOTHING)
--    신규 수령이면 코인 지급 후 coin_reward 반환
-- ============================================================
create or replace function public.claim_mission(
  p_mission_type smallint,
  p_mission_id   integer,
  p_coin_reward  integer
)
returns integer
language plpgsql
security definer
as $$
declare
  v_inserted integer;
begin
  insert into public.claimed_missions (user_id, mission_type, mission_id)
  values (auth.uid(), p_mission_type, p_mission_id)
  on conflict (user_id, mission_type, mission_id) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    update public.profiles
    set coins = coins + p_coin_reward
    where id = auth.uid();
    return p_coin_reward;
  end if;

  return 0;
end;
$$;

-- ============================================================
-- 4. RPC: 미션 일괄 수령 (한 번에 획득 기능)
--    p_missions: [{"mission_type": 1, "mission_id": 2, "coin_reward": 35}, ...]
--    미수령 항목만 처리, 총 지급 코인 합산 후 1회 UPDATE
-- ============================================================
create or replace function public.claim_all_missions(
  p_missions jsonb
)
returns integer
language plpgsql
security definer
as $$
declare
  v_item       jsonb;
  v_total      integer := 0;
  v_inserted   integer;
begin
  for v_item in select * from jsonb_array_elements(p_missions)
  loop
    insert into public.claimed_missions (user_id, mission_type, mission_id)
    values (
      auth.uid(),
      (v_item->>'mission_type')::smallint,
      (v_item->>'mission_id')::integer
    )
    on conflict (user_id, mission_type, mission_id) do nothing;

    get diagnostics v_inserted = row_count;

    if v_inserted > 0 then
      v_total := v_total + (v_item->>'coin_reward')::integer;
    end if;
  end loop;

  if v_total > 0 then
    update public.profiles
    set coins = coins + v_total
    where id = auth.uid();
  end if;

  return v_total;
end;
$$;

-- ============================================================
-- 5. RPC: 수령 완료 미션 목록 조회
--    반환: [{"mission_type": 1, "mission_id": 2}, ...]
-- ============================================================
create or replace function public.get_claimed_missions()
returns jsonb
language plpgsql
security definer
as $$
declare
  v_result jsonb;
begin
  select coalesce(
    jsonb_agg(jsonb_build_object(
      'mission_type', mission_type,
      'mission_id',   mission_id
    )),
    '[]'::jsonb
  )
  into v_result
  from public.claimed_missions
  where user_id = auth.uid();

  return v_result;
end;
$$;

-- ============================================================
-- 6. RPC: 수령 내역 전체 초기화 [개발·테스트 전용]
--    운영 환경에서는 DROP하거나 admin 전용으로 제한할 것.
-- ============================================================
create or replace function public.reset_claimed_missions()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.claimed_missions
  where user_id = auth.uid();
end;
$$;
```

---

## 사용 예시

```sql
-- 단일 미션 수령 (착지 2단계, 보상 35코인)
select claim_mission(1, 2, 35);

-- 일괄 수령
select claim_all_missions('[
  {"mission_type": 1, "mission_id": 1, "coin_reward": 15},
  {"mission_type": 1, "mission_id": 2, "coin_reward": 35},
  {"mission_type": 2, "mission_id": 1, "coin_reward": 50}
]'::jsonb);

-- 착지 미션 수령 목록만 조회 (mission_type 인덱스 활용)
select * from claimed_missions
where user_id = auth.uid() and mission_type = 1;

-- 전체 수령 목록 조회 (JSONB)
select get_claimed_missions();
-- 결과: [{"mission_type": 1, "mission_id": 1}, {"mission_type": 2, "mission_id": 1}]

-- [테스트] 초기화
select reset_claimed_missions();
```

---

## 클라이언트 연동 흐름

```
MissionPopup 열기
  └─ get_claimed_missions()
       → [{mission_type, mission_id}, ...] 수신
       → MissionDef.stage + MISSION_TYPE_ID 로 매핑
       → 수령 완료 여부 판별

수령 버튼 클릭 (MissionDef m)
  └─ claim_mission(MISSION_TYPE_ID[m.type], m.stage, m.coinReward)
  └─ SaveManager.claimMission(m.id)  ← localStorage 동기화

한 번에 획득 버튼 클릭
  └─ claim_all_missions([{mission_type, mission_id, coin_reward}, ...])
  └─ 각 미션 SaveManager 동기화

[테스트] 미션 초기화 (CheatPopup)
  └─ SaveManager.resetClaimedMissions()   ← localStorage
  └─ reset_claimed_missions()             ← DB (연동 후 추가)
```

---

## profiles.md 변경 사항 요약

| 컬럼 | 변경 |
|------|------|
| `best_landings` | 신규 추가 |

| RPC | 변경 |
|-----|------|
| `claim_mission()` | 신규 추가 |
| `claim_all_missions()` | 신규 추가 |
| `get_claimed_missions()` | 신규 추가 |
| `reset_claimed_missions()` | 신규 추가 (테스트용) |

---

## 관련 문서

- [profiles 테이블 전체 스키마](./profiles.md)
- [player_inventory 테이블](./player_inventory.md)
- [미션 밸런스 설계](../BALANCE_DESIGN.md)
- [재화 시스템 설계](../CURRENCY_DESIGN.md)
