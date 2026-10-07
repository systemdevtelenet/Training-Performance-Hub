-- Tables not referenced by the combined Training Hub + Workforce Portal runtime code.
-- Review and back up before running in Supabase SQL Editor.
-- This intentionally avoids CASCADE so dependency issues are visible.

begin;

drop table if exists public.trainers_accounts;
drop table if exists public.trainers_attendance;
drop table if exists public.trainers_attendance_nra;
drop table if exists public.trainers_attendance_strat;
drop table if exists public.trainers_reliability;
drop table if exists public.training_attendance;
drop table if exists public.training_batches;
drop table if exists public.training_milestones;
drop table if exists public.traffic_light_mon_awd_q1;
drop table if exists public.traffic_light_mon_dft_q1;
drop table if exists public.traffic_light_mon_dft_q2;
drop table if exists public.traffic_light_mon_dft_q3;
drop table if exists public.traffic_light_mon_fleet_q1;
drop table if exists public.traffic_light_mon_fleet_q2;
drop table if exists public.traffic_light_mon_fleet_q3;
drop table if exists public.traffic_light_mon_flexar;
drop table if exists public.traffic_light_mon_hh_q3;
drop table if exists public.traffic_light_mon_js_q1;
drop table if exists public.traffic_light_mon_js_q2;
drop table if exists public.traffic_light_mon_js_q3;
drop table if exists public.traffic_light_mon_leaders_q1;
drop table if exists public.traffic_light_mon_leaders_q2;
drop table if exists public.traffic_light_mon_leaders_q3;
drop table if exists public.traffic_light_mon_mm_transpo_q1;
drop table if exists public.traffic_light_mon_mm_transpo_q2;
drop table if exists public.traffic_light_mon_mm_transpo_q3;
drop table if exists public.traffic_light_mon_ono_q1;
drop table if exists public.traffic_light_mon_ono_q2;
drop table if exists public.traffic_light_mon_ono_q3;
drop table if exists public.traffic_light_mon_other_acc_q2;
drop table if exists public.traffic_light_mon_other_acc_q3;
drop table if exists public.traffic_light_mon_rm_q1;
drop table if exists public.traffic_light_mon_rm_q2;
drop table if exists public.traffic_light_mon_rm_q3;
drop table if exists public.traffic_light_mon_trainers_q1;
drop table if exists public.traffic_light_mon_trainers_q2;
drop table if exists public.traffic_light_mon_trainers_q3;
drop table if exists public.traffic_light_mon_trainers_q4;
drop table if exists public.traffic_light_mon_xpn_q2;
drop table if exists public.traffic_light_mon_xpn_q3;
drop table if exists public.trainer_attendance_strat_backup_20260903;

commit;
