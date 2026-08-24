# Migration: add roulette state to profiles

`profiles` 테이블에 일일 룰렛 스핀 상태를 기록하는 컬럼 2개를 추가한다.  
날짜가 바뀌면 `roulette_paid_spins_today`는 애플리케이션 레이어에서 0으로 리셋하여 저장.

---

## 추가 컬럼

| 컬럼 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `last_roulette_date` | date | null | 마지막으로 스핀한 날짜 (null = 한 번도 사용 안 함). 무료 스핀 여부 판별에 사용 |
| `roulette_paid_spins_today` | smallint | 0 | 오늘 사용한 유료 스핀 횟수 (0~3). 날짜 바뀌면 앱에서 0으로 갱신 |

### 비용 테이블 (애플리케이션 상수)

| 유료 스핀 순서 | 다이아몬드 비용 |
|--------------|--------------|
| 1회차 | 2 💎 |
| 2회차 | 3 💎 |
| 3회차 | 5 💎 |

> 일일 최대 스핀: 무료 1회 + 유료 3회 = 총 4회 / 최대 10 💎 소비 가능.

---

## SQL (Supabase SQL Editor에서 실행)

```sql
-- ============================================================
-- profiles에 룰렛 상태 컬럼 추가
-- ============================================================
alter table public.profiles
  add column last_roulette_date        date,
  add column roulette_paid_spins_today smallint not null default 0
    check (roulette_paid_spins_today between 0 and 3);

comment on column public.profiles.last_roulette_date is
  '마지막 스핀 날짜 (null = 미사용). 무료 스핀 초기화 판별';

comment on column public.profiles.roulette_paid_spins_today is
  '당일 유료 스핀 사용 횟수 (0~3). 날짜 변경 시 앱에서 0으로 갱신';

-- ============================================================
-- RPC: 무료 스핀 사용 기록
--   last_roulette_date = today, paid_spins = 0 으로 리셋 (날짜 바뀐 경우 포함)
-- ============================================================
create or replace function public.record_free_roulette()
returns void
language plpgsql
security definer
as $$
begin
  update public.profiles
  set
    last_roulette_date        = current_date,
    roulette_paid_spins_today = 0
  where id = auth.uid();
end;
$$;

-- ============================================================
-- RPC: 유료 스핀 사용
--   비용 배열: [2, 3, 5] 다이아몬드
--   diamonds 잔액 부족 or 오늘 유료 스핀 소진 시 에러 반환
-- ============================================================
create or replace function public.spend_paid_roulette()
returns integer   -- 차감 후 남은 다이아몬드 수
language plpgsql
security definer
as $$
declare
  v_paid_count  smallint;
  v_date        date;
  v_cost        integer;
  costs         integer[] := array[2, 3, 5];
  v_diamonds    integer;
begin
  select last_roulette_date, roulette_paid_spins_today, diamonds
  into   v_date, v_paid_count, v_diamonds
  from   public.profiles
  where  id = auth.uid();

  -- 날짜가 바뀌었으면 유료 횟수 리셋
  if v_date is distinct from current_date then
    v_paid_count := 0;
  end if;

  -- 유료 스핀 소진 확인
  if v_paid_count >= array_length(costs, 1) then
    raise exception 'ROULETTE_EXHAUSTED' using errcode = 'P0002';
  end if;

  v_cost := costs[v_paid_count + 1];

  -- 다이아몬드 잔액 확인
  if v_diamonds < v_cost then
    raise exception 'INSUFFICIENT_DIAMONDS' using errcode = 'P0001';
  end if;

  -- 차감 및 카운트 업데이트
  update public.profiles
  set
    diamonds                  = diamonds - v_cost,
    last_roulette_date        = current_date,
    roulette_paid_spins_today = v_paid_count + 1
  where id = auth.uid()
  returning diamonds into v_diamonds;

  return v_diamonds;
end;
$$;
```

---

## profiles.md 변경 사항 요약

| 컬럼 | 변경 |
|------|------|
| `last_roulette_date` | 신규 추가 |
| `roulette_paid_spins_today` | 신규 추가 |

| RPC | 변경 |
|-----|------|
| `record_free_roulette()` | 신규 추가 |
| `spend_paid_roulette()` | 신규 추가 |

---

## 관련 문서

- [profiles 테이블 전체 스키마](./profiles.md)
- [player_inventory 테이블](./player_inventory.md)
