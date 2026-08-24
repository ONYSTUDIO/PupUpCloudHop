# Schema: player_inventory

플레이어가 보유한 인게임 아이템 수량을 관리하는 테이블.  
`profiles(id)`와 N:1. 아이템 종류가 늘어나도 스키마 변경 없이 row 추가로 확장.

---

## 테이블 구조

| 컬럼 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `user_id` | uuid | — | `profiles(id)` FK, PK의 일부 |
| `item_type` | text | — | 아이템 식별자 (아래 목록 참고), PK의 일부 |
| `quantity` | integer | 0 | 보유 수량 (0 이상 제약) |
| `created_at` | timestamptz | now() | 최초 아이템 획득 일시 |
| `updated_at` | timestamptz | now() | 마지막 수량 변경 일시 |

### item_type 값 정의

| 값 | 설명 | 구현 상태 |
|----|------|-----------|
| `shield` | 방어막 (번개 1회 방어) | ✅ 구현 완료 |
| `magnet` | 자석 (착지 판정 10초 확대) | ✅ 구현 완료 |
| `revival` | 부활 (게임오버 1회 복구) | 🔲 미구현 |

> 신규 아이템 추가 시 이 목록만 갱신. 테이블·RPC 변경 불필요.

---

## RLS 정책

| 정책 | 허용 |
|------|------|
| select | 본인 row만 (`auth.uid() = user_id`) |
| insert | RPC에서만 (security definer) |
| update | RPC에서만 (security definer) |
| delete | 비허용 |

> 클라이언트가 직접 INSERT/UPDATE하면 수량을 임의로 조작할 수 있으므로 RPC 경유만 허용.

---

## RPC 함수

| 함수 | 반환 | 설명 |
|------|------|------|
| `add_item(item_type, amount)` | integer | 아이템 수량 증감. amount > 0 = 획득, amount < 0 = 소비. 잔량 부족 시 에러 |

---

## SQL (Supabase SQL Editor에서 실행)

```sql
-- ============================================================
-- player_inventory 테이블
-- ============================================================
create table public.player_inventory (
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  item_type  text        not null,
  quantity   integer     not null default 0 check (quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (user_id, item_type)
);

-- RLS 활성화
alter table public.player_inventory enable row level security;

create policy "Users can view own inventory"
  on public.player_inventory for select
  using (auth.uid() = user_id);

-- ============================================================
-- updated_at 자동 갱신 트리거
-- (handle_updated_at 함수는 profiles.md에서 이미 생성됨)
-- ============================================================
create trigger inventory_updated_at
  before update on public.player_inventory
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- RPC: 아이템 수량 증감
--   amount > 0 : 획득 (룰렛 보상, 상점 구매 등)
--   amount < 0 : 소비 (게임 시작 전 아이템 사용)
--   row 없으면 INSERT, 있으면 quantity += amount
--   quantity < 0 이 되면 check 제약으로 에러 발생 → 클라이언트에서 잔량 부족 처리
-- ============================================================
create or replace function public.add_item(p_item_type text, p_amount integer)
returns integer
language plpgsql
security definer
as $$
declare
  v_quantity integer;
begin
  insert into public.player_inventory (user_id, item_type, quantity)
  values (auth.uid(), p_item_type, p_amount)
  on conflict (user_id, item_type)
  do update
    set quantity = player_inventory.quantity + p_amount
  returning quantity into v_quantity;

  return v_quantity;
end;
$$;
```

---

## 사용 예시

```sql
-- 방어막 1개 획득 (룰렛 보상)
select add_item('shield', 1);

-- 자석 1개 소비 (게임 시작)
select add_item('magnet', -1);

-- 내 전체 인벤토리 조회
select item_type, quantity from player_inventory where user_id = auth.uid();
```

---

## 관련 문서

- [profiles 테이블](./profiles.md)
- [룰렛 상태 마이그레이션](./add_roulette_state.md)
- [재화 시스템 설계](../CURRENCY_DESIGN.md)
