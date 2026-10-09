-- Make employees the authoritative status source for trainer-roster members.
-- This migration does not update roles, credentials, or non-trainer employees.

begin;

insert into public.statuses (status_name)
select 'AWOL'
where not exists (
  select 1 from public.statuses where upper(trim(status_name)) = 'AWOL'
);

insert into public.statuses (status_name)
select 'Lateral'
where not exists (
  select 1 from public.statuses where upper(trim(status_name)) = 'LATERAL'
);

update public.employees employee
set status_id = status_row.status_id
from public.trainers trainer
join public.statuses status_row
  on upper(trim(status_row.status_name)) = case
    when upper(trim(coalesce(trainer.status, 'ACTIVE'))) = 'AWOL' then 'AWOL'
    when upper(trim(coalesce(trainer.status, 'ACTIVE'))) = 'LATERAL' then 'LATERAL'
    when upper(trim(coalesce(trainer.status, 'ACTIVE'))) = 'RESIGNED' then 'RESIGNED'
    when upper(trim(coalesce(trainer.status, 'ACTIVE'))) = 'INACTIVE' then 'INACTIVE'
    else 'ACTIVE'
  end
where trim(employee.employee_code) = trim(trainer.employee_num)
  and employee.status_id is distinct from status_row.status_id;

commit;

-- Verification: this must return only employees present in the trainers roster.
select
  employee.id,
  employee.employee_code,
  employee.employee_name,
  status_row.status_name
from public.employees employee
join public.trainers trainer
  on trim(trainer.employee_num) = trim(employee.employee_code)
join public.statuses status_row
  on status_row.status_id = employee.status_id
order by employee.employee_name;
