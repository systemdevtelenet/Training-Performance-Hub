-- Consolidate trainer identity/profile data into public.employees.
-- This does not drop or alter trainers_profile.
-- Run in Supabase SQL Editor after reviewing the role/status mapping.

begin;

-- Safe date parser for imported trainer start dates.
-- Accepts M/D/YYYY and YYYY-MM-DD. Invalid values such as imported headers are ignored.
create or replace function public.safe_trainer_start_date(raw_value text)
returns date
language sql
immutable
as $$
  select case
    when nullif(trim(raw_value), '') is null then null
    when trim(raw_value) ~ '^\d{1,2}/\d{1,2}/\d{4}$' then to_date(trim(raw_value), 'MM/DD/YYYY')
    when trim(raw_value) ~ '^\d{4}-\d{2}-\d{2}$' then trim(raw_value)::date
    else null
  end;
$$;

-- Ensure employee roles exist for training personnel.
insert into public.roles (role_id, role_name)
values
  (10, 'Trainer'),
  (11, 'Trainee'),
  (12, 'Head of Training'),
  (13, 'Training Coordinator'),
  (14, 'Corporate Trainer'),
  (15, 'PST Trainer'),
  (16, 'System Developer')
on conflict (role_id) do update
set role_name = excluded.role_name;

-- Update existing employees by employee_code first.
update public.employees e
set
  employee_name = coalesce(nullif(trim(tp.name), ''), e.employee_name),
  employee_email = coalesce(
    nullif(trim(tp.gmail_account), ''),
    nullif(trim(tp.thunderbird_account), ''),
    e.employee_email
  ),
  hire_date = coalesce(public.safe_trainer_start_date(tp.start_date), e.hire_date),
  avatar_url = coalesce(nullif(trim(tp.profile_pic), ''), e.avatar_url),
  status_id = case
    when upper(coalesce(tp.status, '')) = 'RESIGNED' then 3
    when upper(coalesce(tp.status, '')) = 'INACTIVE' then 2
    when upper(coalesce(tp.status, '')) like '%LEAVE%' then 4
    else 1
  end,
  role_id = case
    when upper(coalesce(tp.position, '')) like '%HEAD%' then 12
    when upper(coalesce(tp.position, '')) like '%COORDINATOR%' then 13
    when upper(coalesce(tp.position, '')) like '%CORP%' then 14
    when upper(coalesce(tp.position, '')) like '%PST%' then 15
    when upper(coalesce(tp.position, '')) like '%SYS%' then 16
    else 10
  end
from public.trainers_profile tp
where nullif(trim(tp.employee_num), '') is not null
  and trim(e.employee_code) = trim(tp.employee_num);

-- Update existing employees by email when employee_code did not match.
update public.employees e
set
  employee_code = coalesce(nullif(trim(tp.employee_num), ''), e.employee_code),
  employee_name = coalesce(nullif(trim(tp.name), ''), e.employee_name),
  hire_date = coalesce(public.safe_trainer_start_date(tp.start_date), e.hire_date),
  avatar_url = coalesce(nullif(trim(tp.profile_pic), ''), e.avatar_url),
  status_id = case
    when upper(coalesce(tp.status, '')) = 'RESIGNED' then 3
    when upper(coalesce(tp.status, '')) = 'INACTIVE' then 2
    when upper(coalesce(tp.status, '')) like '%LEAVE%' then 4
    else 1
  end,
  role_id = case
    when upper(coalesce(tp.position, '')) like '%HEAD%' then 12
    when upper(coalesce(tp.position, '')) like '%COORDINATOR%' then 13
    when upper(coalesce(tp.position, '')) like '%CORP%' then 14
    when upper(coalesce(tp.position, '')) like '%PST%' then 15
    when upper(coalesce(tp.position, '')) like '%SYS%' then 16
    else 10
  end
from public.trainers_profile tp
where coalesce(nullif(trim(tp.gmail_account), ''), nullif(trim(tp.thunderbird_account), '')) is not null
  and lower(trim(e.employee_email)) = lower(trim(coalesce(nullif(tp.gmail_account, ''), nullif(tp.thunderbird_account, ''))))
  and not exists (
    select 1
    from public.employees existing
    where nullif(trim(tp.employee_num), '') is not null
      and trim(existing.employee_code) = trim(tp.employee_num)
  );

-- Insert trainers that do not exist yet in employees.
insert into public.employees (
  employee_code,
  employee_name,
  employee_email,
  hire_date,
  avatar_url,
  status_id,
  role_id
)
select
  nullif(trim(tp.employee_num), '') as employee_code,
  nullif(trim(tp.name), '') as employee_name,
  coalesce(nullif(trim(tp.gmail_account), ''), nullif(trim(tp.thunderbird_account), '')) as employee_email,
  public.safe_trainer_start_date(tp.start_date) as hire_date,
  nullif(trim(tp.profile_pic), '') as avatar_url,
  case
    when upper(coalesce(tp.status, '')) = 'RESIGNED' then 3
    when upper(coalesce(tp.status, '')) = 'INACTIVE' then 2
    when upper(coalesce(tp.status, '')) like '%LEAVE%' then 4
    else 1
  end as status_id,
  case
    when upper(coalesce(tp.position, '')) like '%HEAD%' then 12
    when upper(coalesce(tp.position, '')) like '%COORDINATOR%' then 13
    when upper(coalesce(tp.position, '')) like '%CORP%' then 14
    when upper(coalesce(tp.position, '')) like '%PST%' then 15
    when upper(coalesce(tp.position, '')) like '%SYS%' then 16
    else 10
  end as role_id
from public.trainers_profile tp
where nullif(trim(tp.name), '') is not null
  and not exists (
    select 1
    from public.employees e
    where (
      nullif(trim(tp.employee_num), '') is not null
      and trim(e.employee_code) = trim(tp.employee_num)
    )
    or (
      coalesce(nullif(trim(tp.gmail_account), ''), nullif(trim(tp.thunderbird_account), '')) is not null
      and lower(trim(e.employee_email)) = lower(trim(coalesce(nullif(tp.gmail_account, ''), nullif(tp.thunderbird_account, ''))))
    )
  );

commit;

-- Verification query:
-- select e.employee_code, e.employee_name, e.employee_email, r.role_name, s.status_name
-- from public.employees e
-- left join public.roles r on r.role_id = e.role_id
-- left join public.statuses s on s.status_id = e.status_id
-- where e.role_id in (10, 12, 13, 14, 15, 16)
-- order by e.employee_name;
