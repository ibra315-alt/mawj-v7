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
-- CUSTOMERS TABLE (was previously derived from orders)
-- ============================================================
create table customers (
  id uuid primary key default uuid_generate_v4(),
  customer_id text unique,              -- e.g. MWJ-C0001
  name text not null,
  phone text,
  email text,
  city text,
  segment text default 'جديد',          -- VIP, مخلص, نشط, جديد, خامل
  total_spent numeric default 0,
  total_profit numeric default 0,
  order_count integer default 0,
  avg_order numeric default 0,
  first_order_date timestamptz,
  last_order_date timestamptz,
  notes text,
  tags jsonb default '[]',
  whatsapp_opted_in boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_customers_phone on customers(phone);
create index idx_customers_segment on customers(segment);
create index idx_customers_city on customers(city);

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
alter table customers enable row level security;

-- ── Real RLS policies (role-based) ──
-- Helper function to get current user's role
create or replace function auth_user_role()
returns text as $$
  select role from users where email = auth.jwt() ->> 'email' limit 1;
$$ language sql security definer stable;

-- Settings: admin can write, all authenticated can read
create policy "settings_read" on settings for select to authenticated using (true);
create policy "settings_write" on settings for all to authenticated
  using (auth_user_role() = 'admin')
  with check (auth_user_role() = 'admin');

-- Users: admin can manage, self can read
create policy "users_read" on users for select to authenticated using (true);
create policy "users_write" on users for all to authenticated
  using (auth_user_role() = 'admin')
  with check (auth_user_role() = 'admin');

-- Orders: admin/accountant/sales can manage, viewer can read
create policy "orders_read" on orders for select to authenticated using (true);
create policy "orders_write" on orders for insert to authenticated
  with check (auth_user_role() in ('admin', 'accountant', 'sales'));
create policy "orders_update" on orders for update to authenticated
  using (auth_user_role() in ('admin', 'accountant', 'sales'));
create policy "orders_delete" on orders for delete to authenticated
  using (auth_user_role() in ('admin', 'accountant'));

-- Customers: same as orders
create policy "customers_read" on customers for select to authenticated using (true);
create policy "customers_write" on customers for all to authenticated
  using (auth_user_role() in ('admin', 'accountant', 'sales'))
  with check (auth_user_role() in ('admin', 'accountant', 'sales'));

-- Financial tables: admin and accountant only
create policy "settlements_all" on settlements for all to authenticated
  using (auth_user_role() in ('admin', 'accountant'))
  with check (auth_user_role() in ('admin', 'accountant'));

create policy "expenses_read" on expenses for select to authenticated using (true);
create policy "expenses_write" on expenses for all to authenticated
  using (auth_user_role() in ('admin', 'accountant'))
  with check (auth_user_role() in ('admin', 'accountant'));

create policy "capital_all" on capital_entries for all to authenticated
  using (auth_user_role() in ('admin'))
  with check (auth_user_role() in ('admin'));

create policy "withdrawals_all" on withdrawals for all to authenticated
  using (auth_user_role() in ('admin'))
  with check (auth_user_role() in ('admin'));

-- Inventory: all can read, admin/accountant can write
create policy "inventory_read" on inventory for select to authenticated using (true);
create policy "inventory_write" on inventory for all to authenticated
  using (auth_user_role() in ('admin', 'accountant'))
  with check (auth_user_role() in ('admin', 'accountant'));

-- Suppliers: admin/accountant
create policy "suppliers_read" on suppliers for select to authenticated using (true);
create policy "suppliers_write" on suppliers for all to authenticated
  using (auth_user_role() in ('admin', 'accountant'))
  with check (auth_user_role() in ('admin', 'accountant'));

create policy "supplier_purchases_read" on supplier_purchases for select to authenticated using (true);
create policy "supplier_purchases_write" on supplier_purchases for all to authenticated
  using (auth_user_role() in ('admin', 'accountant'))
  with check (auth_user_role() in ('admin', 'accountant'));

-- Discounts: admin only
create policy "discounts_read" on discounts for select to authenticated using (true);
create policy "discounts_write" on discounts for all to authenticated
  using (auth_user_role() = 'admin')
  with check (auth_user_role() = 'admin');

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
('statuses', '[{"id":"new","label":"جديد","color":"#38BDF8","order":0},{"id":"confirmed","label":"مؤكد","color":"#3b82f6","order":1},{"id":"processing","label":"قيد التجهيز","color":"#f59e0b","order":2},{"id":"shipped","label":"تم الشحن","color":"#0EA5E9","order":3},{"id":"delivered","label":"تم التسليم","color":"#10b981","order":4},{"id":"returned","label":"مرتجع","color":"#ff4757","order":5},{"id":"cancelled","label":"ملغي","color":"#6b7280","order":6}]'),
('products', '[{"id":"p1","name":"طقم كريستال ملكي","cost":45,"price":120,"sku":"CRY-001"},{"id":"p2","name":"فازة كريستال فاخرة","cost":30,"price":85,"sku":"CRY-002"},{"id":"p3","name":"إطار كريستال ذهبي","cost":25,"price":70,"sku":"CRY-003"},{"id":"p4","name":"طقم هدايا كريستال","cost":60,"price":150,"sku":"CRY-004"}]'),
('order_sources', '["instagram","tiktok","website","walk_in","other"]'),
('appearance', '{"theme":"light","mode":"light","accent":"#38BDF8","font":"Almarai, sans-serif","fontSize":"medium","radius":"rounded","density":"normal","animations":true,"noise":false,"spotlight":false,"_v3":true}'),
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
