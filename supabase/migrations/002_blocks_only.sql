-- Drama classes are folded into blocks; every schedule entry is now a block.
-- Blocks no longer close a period outright — teachers can request them and
-- the office decides. Existing drama entries become blocks with the same label.

alter table public.schedule_entries drop column if exists kind;

alter table public.bookings rename column drama_overlap to block_overlap;
