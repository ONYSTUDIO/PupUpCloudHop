# Schema: profiles

유저의 게임 프로필 및 재화(코인/다이아몬드) 상태를 저장하는 테이블.
Supabase Auth의 `auth.users`와 1:1 연결. 구글/애플/페이스북 OAuth 로그인 지원.

---

## 테이블 구조

| 컬럼 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `id` | uuid | — | `auth.users(id)` FK, PK |
| `username` | text | null | 프로필 이름 (OAuth는 first login 시 자동 입력, 게스트는 '게스트') |
| `avatar_url` | text | null | OAuth 프로필 이미지 URL (게스트는 null) |
| `login_type` | smallint | 0 | 로그인 방식 (0=게스트, 1=Google, 2=Apple, 3=Facebook) |
| `coins` | integer | 0 | 소프트 커런시 (코인) |
| `diamonds` | integer | 0 | 하드 커런시 (다이아몬드) |
| `best_score` | integer | 0 | 역대 최고 점수 |
| `total_play_count` | integer | 0 | 총 플레이 횟수 |
| `created_at` | timestamptz | now() | 계정 최초 생성 일시 |
| `updated_at` | timestamptz | now() | 마지막 업데이트 일시 |

---

## RLS 정책

| 정책 | 허용 |
|------|------|
| select | 본인 row만 (`auth.uid() = id`) |
| update | 본인 row만 (`auth.uid() = id`) |
| insert | 트리거에서만 (service_role) |
| delete | 비허용 |

---

## RPC 함수

| 함수 | 반환 | 설명 |
|------|------|------|
| `add_coins(amount int)` | integer | 코인 증감 (음수 가능, 동시성 안전) |
| `add_diamonds(amount int)` | integer | 다이아몬드 증감 (음수 가능, 동시성 안전) |

> 직접 `UPDATE SET coins = coins + N` 대신 RPC를 사용해야 동시 요청 시 손실 없음.

---

## SQL (Supabase SQL Editor에서 실행)

```sql
-- ============================================================
-- profiles 테이블
-- ============================================================
create table public.profiles (
  id               uuid        references auth.users(id) on delete cascade primary key,
  username         text,
  avatar_url       text,

  coins            integer     not null default 0 check (coins >= 0),
  diamonds         integer     not null default 0 check (diamonds >= 0),

  best_score       integer     not null default 0,
  total_play_count integer     not null default 0,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- RLS 활성화
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ============================================================
-- OAuth 회원가입 시 profiles 자동 생성 트리거
-- Google: raw_user_meta_data.full_name / avatar_url
-- Apple:  raw_user_meta_data.full_name (첫 로그인만 제공)
-- Facebook: raw_user_meta_data.full_name / avatar_url
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- updated_at 자동 갱신 트리거
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- 코인/다이아몬드 증감 RPC (동시성 안전)
-- 음수 amount로 소비 처리 가능
-- check 제약(>= 0)이 잔액 부족 시 에러를 발생시킴
-- ============================================================
create or replace function public.add_coins(amount integer)
returns integer
language plpgsql
security definer
as $$
declare
  new_coins integer;
begin
  update public.profiles
  set coins = coins + amount
  where id = auth.uid()
  returning coins into new_coins;
  return new_coins;
end;
$$;

create or replace function public.add_diamonds(amount integer)
returns integer
language plpgsql
security definer
as $$
declare
  new_diamonds integer;
begin
  update public.profiles
  set diamonds = diamonds + amount
  where id = auth.uid()
  returning diamonds into new_diamonds;
  return new_diamonds;
end;
$$;
```

---

## 관련 문서

- [재화 시스템 설계](../CURRENCY_DESIGN.md)
- [기술 스택](../TECH_STACK.md)
