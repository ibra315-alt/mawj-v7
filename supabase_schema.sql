-- ============================================================
-- MAWJ ERP V7 — Supabase Schema
-- Run this in SQL Editor on a fresh Supabase project
-- ============================================================

create extension if not exists "uuid-ossp";

-- DROP TABLES (clean slate)
drop table if exists withdrawals cascade;
drop table if exists capital_entries cascade;
drop table if exists discounts cascade;
drop table if exists supplier_purchases cascade;
drop table if exists suppliers cascade;
drop table if exists inventory cascade;
drop table if exists expenses cascade;
drop table if exists settlements cascade;
drop table if exists orders cascade;
drop table if exists users cascade;
drop table if exists settings cascade;

-- ============================================================
-- TABLES
-- ============================================================

create table settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

create table users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  name text not null,
  role text not null default 'sales',
  permissions jsonb default '{}',
  active boolean default true,
  created_at timestamptz default now()
);

create table orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text unique not null,
  customer_name text not null,
  customer_phone text,
  customer_city text,
  delivery_zone text,
  delivery_cost numeric default 0,
  source text default 'instagram',
  status text not null default 'new',
  items jsonb default '[]',
  subtotal numeric default 0,
  discount_code text,
  discount_amount numeric default 0,
  total numeric default 0,
  cost numeric default 0,
  profit numeric default 0,
  courier text,
  tracking_number text,
  expected_delivery date,
  notes text,
  internal_notes jsonb default '[]',
  photos jsonb default '[]',
  custom_fields jsonb default '{}',
  created_by uuid references users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table settlements (
  id uuid primary key default uuid_generate_v4(),
  partner_name text not null,
  amount numeric not null,
  type text not null default 'income',
  category text,
  notes text,
  date date default current_date,
  created_at timestamptz default now()
);

create table expenses (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  amount numeric not null,
  category text not null default 'general',
  paid_by text,
  notes text,
  date date default current_date,
  receipt_url text,
  created_at timestamptz default now()
);

create table inventory (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sku text unique,
  category text,
  cost_price numeric default 0,
  sell_price numeric default 0,
  stock_qty integer default 0,
  low_stock_threshold integer default 5,
  supplier_id uuid,
  notes text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table suppliers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text,
  email text,
  city text,
  country text default 'UAE',
  notes text,
  active boolean default true,
  created_at timestamptz default now()
);

create table supplier_purchases (
  id uuid primary key default uuid_generate_v4(),
  supplier_id uuid references suppliers(id),
  items jsonb default '[]',
  total numeric default 0,
  paid boolean default false,
  payment_date date,
  notes text,
  date date default current_date,
  created_at timestamptz default now()
);

create table capital_entries (
  id uuid primary key default uuid_generate_v4(),
  partner_name text not null,
  amount numeric not null,
  type text default 'deposit',
  notes text,
  date date default current_date,
  created_at timestamptz default now()
);

create table withdrawals (
  id uuid primary key default uuid_generate_v4(),
  partner_name text not null,
  amount numeric not null,
  type text default 'salary',
  notes text,
  date date default current_date,
  created_at timestamptz default now()
);

create table discounts (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  type text default 'percent',
  value numeric not null,
  min_order numeric default 0,
  max_uses integer,
  uses_count integer default 0,
  active boolean default true,
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table settings enable row level security;
alter table users enable row level security;
alter table orders enable row level security;
alter table settlements enable row level security;
alter table expenses enable row level security;
alter table inventory enable row level security;
alter table suppliers enable row level security;
alter table supplier_purchases enable row level security;
alter table capital_entries enable row level security;
alter table withdrawals enable row level security;
alter table discounts enable row level security;

create policy "auth_all" on settings for all to authenticated using (true) with check (true);
create policy "auth_all" on users for all to authenticated using (true) with check (true);
create policy "auth_all" on orders for all to authenticated using (true) with check (true);
create policy "auth_all" on settlements for all to authenticated using (true) with check (true);
create policy "auth_all" on expenses for all to authenticated using (true) with check (true);
create policy "auth_all" on inventory for all to authenticated using (true) with check (true);
create policy "auth_all" on suppliers for all to authenticated using (true) with check (true);
create policy "auth_all" on supplier_purchases for all to authenticated using (true) with check (true);
create policy "auth_all" on capital_entries for all to authenticated using (true) with check (true);
create policy "auth_all" on withdrawals for all to authenticated using (true) with check (true);
create policy "auth_all" on discounts for all to authenticated using (true) with check (true);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_orders_status on orders(status);
create index idx_orders_created on orders(created_at desc);
create index idx_orders_customer on orders(customer_name);
create index idx_expenses_date on expenses(date desc);

-- ============================================================
-- SEED SETTINGS
-- ============================================================

insert into settings (key, value) values
('business', '{"name":"مَوج","logo":"","monthly_target":50000,"currency":"AED","couriers":["Hayyak","Aramex","DHL","FedEx","Fetchr"],"delivery_zones":[{"city":"أبوظبي","cost":25},{"city":"دبي","cost":20},{"city":"الشارقة","cost":20},{"city":"عجمان","cost":20},{"city":"أم القيوين","cost":25},{"city":"رأس الخيمة","cost":30},{"city":"الفجيرة","cost":35}]}'),
('statuses', '[{"id":"new","label":"جديد","color":"#00e4b8","order":0},{"id":"confirmed","label":"مؤكد","color":"#7c3aed","order":1},{"id":"processing","label":"قيد التجهيز","color":"#f59e0b","order":2},{"id":"shipped","label":"تم الشحن","color":"#3b82f6","order":3},{"id":"delivered","label":"تم التسليم","color":"#10b981","order":4},{"id":"returned","label":"مرتجع","color":"#ff4757","order":5},{"id":"cancelled","label":"ملغي","color":"#6b7280","order":6}]'),
('products', '[{"id":"p1","name":"طقم كريستال ملكي","cost":45,"price":120,"sku":"CRY-001"},{"id":"p2","name":"فازة كريستال فاخرة","cost":30,"price":85,"sku":"CRY-002"},{"id":"p3","name":"إطار كريستال ذهبي","cost":25,"price":70,"sku":"CRY-003"},{"id":"p4","name":"طقم هدايا كريستال","cost":60,"price":150,"sku":"CRY-004"}]'),
('order_sources', '["instagram","tiktok","website","walk_in","other"]'),
('appearance', '{"theme":"dark","font":"Noto Kufi Arabic","fontSize":14,"primaryColor":"#00e4b8","accentColor":"#7c3aed"}'),
('whatsapp_templates', '{"order_confirm":"مرحباً {customer_name}،\nتم استلام طلبكم رقم {order_number} بنجاح ✅\nالمبلغ الإجمالي: {total} د.إ\nسيتم التواصل معكم قريباً لتأكيد التوصيل 🚚","order_shipped":"مرحباً {customer_name}،\nطلبكم رقم {order_number} في الطريق إليكم 🚚✨\nرقم التتبع: {tracking_number}","order_delivered":"مرحباً {customer_name}،\nتم توصيل طلبكم بنجاح 🎁\nنتمنى أن ينال إعجابكم 💎","daily_summary":"📊 ملخص اليوم - {date}\n\nالطلبات الجديدة: {new_orders}\nإجمالي المبيعات: {revenue} د.إ\nالأرباح: {profit} د.إ"}'),
('custom_fields', '[]'),
('partners', '["إبراهيم","الشريك الثاني"]');

-- SEED USERS
insert into users (email, name, role) values
('ibra.315@gmail.com', 'إبراهيم', 'admin'),
('admin@mawj.ae', 'المدير', 'admin'),
('accountant@mawj.ae', 'المحاسب', 'accountant'),
('sales@mawj.ae', 'المبيعات', 'sales');

-- AFTER RUNNING: Create matching auth users in Supabase Dashboard > Authentication > Users
