create extension if not exists pgcrypto;

create table if not exists trainees (
  id uuid primary key default gen_random_uuid(),
  name text,
  status text,
  month text,
  quarter text,
  p integer default 0,
  a integer default 0,
  isEndorsed boolean default false,
  isLoss boolean default false,
  assignedTrainer text,
  batchName text,
  accountName text,
  created_at timestamptz default now()
);

create table if not exists trainers (
  id uuid primary key default gen_random_uuid(),
  name text,
  status text,
  pos text,
  employeeNo text,
  startDate text,
  accounts text[],
  attRate double precision default 0,
  relRate double precision default 0,
  profilePic text,
  created_at timestamptz default now()
);

create index if not exists trainees_name_idx on trainees (name);
create index if not exists trainers_name_idx on trainers (name);

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  icon_type text not null,
  author text not null,
  created_at timestamptz default now()
);
