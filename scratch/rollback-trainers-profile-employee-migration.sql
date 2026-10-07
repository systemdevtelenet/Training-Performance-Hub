-- Roll back the risky parts of migrate-trainers-profile-to-employees.sql.
-- This is designed for the shared database where QA Tool depends on employees.
--
-- What this does:
-- 1. Restores known login-capable employees that were overwritten by trainer role/status mapping.
-- 2. Deletes profile-only employee rows inserted from trainers_profile during the migration.
-- 3. Removes added training-only roles if no remaining employees use them.
--
-- Review before running.

begin;

-- Immediate QA Tool login fix for the known HOT admin account.
update public.employees
set
  role_id = 5,
  status_id = 1
where lower(employee_email) = 'nreguero.telenet@gmail.com';

-- Restore other existing login-capable trainer rows to active status.
-- Keep role_id as Admin only for system/admin-style accounts; leave non-admin trainers active.
update public.employees
set status_id = 1
where id in (480, 487, 517)
  and password_hash is not null;

-- Delete rows that were inserted as profile-only trainer copies by the migration.
-- These rows have no password_hash and IDs created at the end of the employees sequence.
delete from public.employees
where id in (
  1018, 1019, 1020, 1021, 1022, 1023, 1024, 1025, 1026,
  1027, 1028, 1029, 1030, 1031, 1032, 1033, 1034
)
and password_hash is null;

-- Do not delete id 741 or id 1015 automatically because they may have existed before the migration.
-- They can be reviewed manually.

-- Remove trainer-only roles if they are no longer used.
delete from public.roles r
where r.role_id in (10, 11, 12, 13, 14, 15, 16)
  and not exists (
    select 1
    from public.employees e
    where e.role_id = r.role_id
  );

commit;

-- Verification:
-- select id, employee_code, employee_name, employee_email, role_id, status_id
-- from public.employees
-- where lower(employee_email) = 'nreguero.telenet@gmail.com';
