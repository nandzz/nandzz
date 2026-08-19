-- Account type on profiles: separates a Personal account from a Business account.
-- Every user starts as 'personal'. A personal account has the Business sections
-- (Widgets, Brand, …) hidden and instead sees a "Switch to Business Account" CTA.
-- Switching flips this to 'business', which reveals the Business sections and
-- hides the personal "Bookings" section (a business books nobody — it gets booked).
-- Default 'personal' so every existing profile keeps the personal experience.
alter table public.profiles
  add column if not exists account_type text not null default 'personal'
    check (account_type in ('personal', 'business'));
