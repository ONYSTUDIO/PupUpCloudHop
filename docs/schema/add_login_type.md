# Migration: add login_type to profiles

profiles 테이블에 `login_type` 컬럼을 추가하고,
로그인 방식(게스트/소셜)을 정수형으로 관리한다.

---

## login_type 값 정의

| 값 | 로그인 방식 |
|----|------------|
| 0  | 게스트 (anonymous) |
| 1  | Google |
| 2  | Apple |
| 3  | Facebook |

---

## 사전 준비 (Supabase Dashboard)

**Authentication → Configuration → Anonymous sign-ins → Enable** 활성화 필요.
게스트 로그인은 Supabase 익명 인증을 사용하므로 반드시 켜야 한다.

---

## SQL (Supabase SQL Editor에서 실행)

```sql
-- ============================================================
-- 1. login_type 컬럼 추가
-- ============================================================
alter table public.profiles
  add column login_type smallint not null default 0;

comment on column public.profiles.login_type is
  '0=guest, 1=google, 2=apple, 3=facebook';

-- ============================================================
-- 2. handle_new_user 트리거 함수 갱신
--    raw_app_meta_data.provider 로 login_type 자동 결정
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_provider   text;
  v_login_type smallint;
begin
  v_provider := coalesce(new.raw_app_meta_data->>'provider', 'anonymous');

  v_login_type := case v_provider
    when 'google'   then 1
    when 'apple'    then 2
    when 'facebook' then 3
    else 0
  end;

  insert into public.profiles (id, username, avatar_url, login_type)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, ''), '@', 1),
      '게스트'
    ),
    new.raw_user_meta_data->>'avatar_url',
    v_login_type
  );
  return new;
end;
$$;
```

---

## profiles.md 변경 사항 요약

- `login_type smallint not null default 0` 컬럼 추가
- `handle_new_user` 함수 갱신 (provider 기반 자동 분기)

---

## 관련 문서

- [profiles 테이블 전체 스키마](./profiles.md)
