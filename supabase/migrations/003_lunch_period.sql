-- Add Lunch ('L') as a bookable/blockable period.

alter table public.bookings
  drop constraint if exists bookings_period_check,
  add constraint bookings_period_check
    check (period in ('1','2','3','4','L','5','6','7','8','AS'));

alter table public.schedule_entries
  drop constraint if exists schedule_entries_from_period_check,
  add constraint schedule_entries_from_period_check
    check (from_period in ('1','2','3','4','L','5','6','7','8','AS')),
  drop constraint if exists schedule_entries_to_period_check,
  add constraint schedule_entries_to_period_check
    check (to_period in ('1','2','3','4','L','5','6','7','8','AS'));
