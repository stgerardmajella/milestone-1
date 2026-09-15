-- Milestone 2: prototype activity destination coordinates
--
-- These coordinates are prototype destination anchors for the existing
-- sample activities. They are not user-location data.
--
-- Milestone 5 live research will provide actual coordinates for
-- dynamically researched venues and activities.

update public.activities
set latitude = -33.92306,
    longitude = 18.41898
where name = 'Art Gallery Afternoon';

update public.activities
set latitude = -34.10825,
    longitude = 18.47047
where name = 'Beach Day at Muizenberg';

update public.activities
set latitude = -33.9200,
    longitude = 18.4130
where name = 'Bo-Kaap Food Experience';

update public.activities
set latitude = -33.9067,
    longitude = 18.41907
where name = 'Cape Town Comedy Night';

update public.activities
set latitude = -33.97962,
    longitude = 18.46558
where name = 'Claremont Bowling Session';

update public.activities
set latitude = -33.92731,
    longitude = 18.41712
where name = 'Company''s Garden Picnic';

update public.activities
set latitude = -33.92891,
    longitude = 18.41495
where name = 'Iziko Museum Visit';

update public.activities
set latitude = -33.9416,
    longitude = 18.4313
where name = 'Kirstenbosch Garden Visit';

update public.activities
set latitude = -33.9816965,
    longitude = 18.4638168
where name = 'Live Jazz Evening';

update public.activities
set latitude = -33.911679,
    longitude = 18.388372
where name = 'Sea Point Promenade Walk';

update public.activities
set latitude = -33.9173,
    longitude = 18.3930
where name = 'Signal Hill Sunset Picnic';

update public.activities
set latitude = -33.90600605,
    longitude = 18.4195134874351
where name = 'Sunset Harbour Cruise';

update public.activities
set latitude = -33.9520,
    longitude = 18.4019
where name = 'Table Mountain Cableway';

update public.activities
set latitude = -33.9078944,
    longitude = 18.4176556
where name = 'Two Oceans Aquarium Visit';

update public.activities
set latitude = -33.9065739,
    longitude = 18.4192666
where name = 'V&A Waterfront Food Market';
