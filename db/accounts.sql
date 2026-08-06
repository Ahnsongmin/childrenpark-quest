-- 공원 원정대 계정 (아이디 + 비밀번호만)
-- 설계: accounts 테이블은 RLS 켜고 정책을 하나도 두지 않는다 → 공개키(anon)로는 직접 읽기·쓰기 불가.
-- 접근은 아래 SECURITY DEFINER 함수 5개로만 가능하고, 함수는 절대 비밀번호 해시를 돌려주지 않는다.
-- 비밀번호는 pgcrypto bcrypt(crypt + gen_salt('bf'))로 저장하며 평문은 어디에도 남지 않는다.

create extension if not exists pgcrypto with schema extensions;

alter table public.accounts add column if not exists token uuid;

-- ① 아이디 중복 확인
create or replace function public.account_taken(p_user text)
returns boolean
language sql security definer set search_path = public, extensions as $fn$
  select exists(select 1 from public.accounts where username = lower(btrim(p_user)));
$fn$;

-- ② 회원가입 — 아이디 형식·중복·비밀번호 길이 검사 후 바로 가입, 세션 토큰 발급
create or replace function public.account_signup(p_user text, p_pw text, p_data jsonb default '{}'::jsonb)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $fn$
declare u text := lower(btrim(p_user)); t uuid := gen_random_uuid();
begin
  if u !~ '^[a-z0-9_]{4,16}$' then return jsonb_build_object('ok', false, 'error', 'id_format'); end if;
  if p_pw is null or length(p_pw) < 4 then return jsonb_build_object('ok', false, 'error', 'pw_short'); end if;
  if exists(select 1 from public.accounts where username = u) then
    return jsonb_build_object('ok', false, 'error', 'taken');
  end if;
  insert into public.accounts(username, pw_hash, token, data)
    values (u, crypt(p_pw, gen_salt('bf')), t, coalesce(p_data, '{}'::jsonb));
  return jsonb_build_object('ok', true, 'username', u, 'token', t);
end $fn$;

-- ③ 로그인 — 맞으면 새 토큰과 저장해 둔 기록을 함께 돌려준다
create or replace function public.account_login(p_user text, p_pw text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $fn$
declare u text := lower(btrim(p_user)); r public.accounts%rowtype; t uuid := gen_random_uuid();
begin
  select * into r from public.accounts where username = u;
  if not found or r.pw_hash <> crypt(p_pw, r.pw_hash) then
    return jsonb_build_object('ok', false, 'error', 'bad_login');
  end if;
  update public.accounts set token = t, updated_at = now() where username = u;
  return jsonb_build_object('ok', true, 'username', u, 'token', t, 'data', r.data);
end $fn$;

-- ④ 기록 저장 — 토큰이 맞아야만 덮어쓸 수 있다 (남의 아이디에 못 쓴다)
create or replace function public.account_save(p_user text, p_token uuid, p_data jsonb)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $fn$
declare u text := lower(btrim(p_user)); n int;
begin
  if p_data is null or pg_column_size(p_data) > 300000 then
    return jsonb_build_object('ok', false, 'error', 'too_big');
  end if;
  update public.accounts set data = p_data, updated_at = now()
    where username = u and token = p_token;
  get diagnostics n = row_count;
  if n = 0 then return jsonb_build_object('ok', false, 'error', 'bad_token'); end if;
  return jsonb_build_object('ok', true);
end $fn$;

-- ⑤ 기록 불러오기 (재접속 시 토큰만으로)
create or replace function public.account_load(p_user text, p_token uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $fn$
declare u text := lower(btrim(p_user)); r public.accounts%rowtype;
begin
  select * into r from public.accounts where username = u and token = p_token;
  if not found then return jsonb_build_object('ok', false, 'error', 'bad_token'); end if;
  return jsonb_build_object('ok', true, 'username', u, 'data', r.data);
end $fn$;

revoke all on function public.account_taken(text) from public;
revoke all on function public.account_signup(text, text, jsonb) from public;
revoke all on function public.account_login(text, text) from public;
revoke all on function public.account_save(text, uuid, jsonb) from public;
revoke all on function public.account_load(text, uuid) from public;

grant execute on function public.account_taken(text) to anon, authenticated;
grant execute on function public.account_signup(text, text, jsonb) to anon, authenticated;
grant execute on function public.account_login(text, text) to anon, authenticated;
grant execute on function public.account_save(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.account_load(text, uuid) to anon, authenticated;
