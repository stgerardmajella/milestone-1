-- Milestone 2: activity destination coordinates
-- Coordinates are optional because existing activities may not have them yet.

alter table public.activities
  add column latitude numeric,
  add column longitude numeric;

alter table public.activities
  add constraint activities_latitude_range
  check (latitude is null or latitude between -90 and 90);

alter table public.activities
  add constraint activities_longitude_range
  check (longitude is null or longitude between -180 and 180);
