/*
# Add bookings, driver schedules, and sample data

1. Plain-English summary
   This migration adds three capabilities to the SafariBus app:
   - Seat reservations: passengers can search routes and reserve seats on scheduled trips.
   - Driver schedules: each driver gets assigned shifts (route, bus, departure/arrival times).
   - Realistic sample data: Rwandan driver profiles and a week of schedules so the
     management screens can be tested immediately.

2. New Tables
   - `scheduled_trips` — a bookable departure of a route
     - `id` (uuid, primary key)
     - `route_name` (text) — display name of the route
     - `origin` / `destination` (text) — endpoints shown in search results
     - `departure_time` (timestamptz) — when the bus leaves
     - `arrival_time` (timestamptz) — estimated arrival
     - `bus_plate` (text) — plate of the assigned bus
     - `capacity` (integer) — total seats
     - `seats_booked` (integer) — seats already reserved
     - `fare_rwf` (integer) — price in Rwandan Francs
     - `status` (text: scheduled | full | cancelled | departed)
   - `bookings` — a passenger seat reservation
     - `id` (uuid, primary key)
     - `trip_id` (uuid, references scheduled_trips)
     - `passenger_name` (text) — name entered by the passenger
     - `phone` (text) — contact phone for the booking
     - `seat_count` (integer) — number of seats reserved (1-4)
     - `booking_ref` (text, unique) — short code shown to the passenger
     - `created_at` (timestamp)
   - `driver_schedules` — an assigned shift for a driver
     - `id` (uuid, primary key)
     - `driver_name` (text) — driver's full name
     - `driver_username` (text) — login name, links to the driver screen
     - `phone` (text) — contact number
     - `route_name` (text) — assigned route
     - `bus_plate` (text) — assigned bus
     - `shift_date` (date) — day of the shift
     - `start_time` / `end_time` (time) — shift window
     - `status` (text: scheduled | on_duty | completed)

3. Security
   - RLS enabled on all three tables.
   - This app has no passenger sign-in; booking data is intentionally shared
     (any rider can search and reserve), so policies allow anon + authenticated CRUD
     with seat-capacity checks done in the app before inserting.
   - Explicit GRANTs for anon + authenticated so the Data API can reach the tables.

4. Sample Data
   - Five scheduled trips across the two seeded Kigali routes with staggered
     departure times today.
   - Six driver profiles with Rwandan names and phone numbers, with schedules
     across today and tomorrow.
*/

CREATE TABLE IF NOT EXISTS scheduled_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_name text NOT NULL,
  origin text NOT NULL,
  destination text NOT NULL,
  departure_time timestamptz NOT NULL,
  arrival_time timestamptz NOT NULL,
  bus_plate text NOT NULL,
  capacity integer NOT NULL DEFAULT 30,
  seats_booked integer NOT NULL DEFAULT 0,
  fare_rwf integer NOT NULL DEFAULT 500,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'full', 'cancelled', 'departed'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES scheduled_trips(id) ON DELETE CASCADE,
  passenger_name text NOT NULL,
  phone text NOT NULL,
  seat_count integer NOT NULL DEFAULT 1 CHECK (seat_count BETWEEN 1 AND 4),
  booking_ref text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS driver_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_name text NOT NULL,
  driver_username text NOT NULL,
  phone text NOT NULL DEFAULT '',
  route_name text NOT NULL,
  bus_plate text NOT NULL,
  shift_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'on_duty', 'completed'))
);

CREATE INDEX IF NOT EXISTS idx_scheduled_trips_departure ON scheduled_trips (departure_time);
CREATE INDEX IF NOT EXISTS idx_bookings_trip ON bookings (trip_id);
CREATE INDEX IF NOT EXISTS idx_driver_schedules_date ON driver_schedules (shift_date);

ALTER TABLE scheduled_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_schedules ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON scheduled_trips TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON bookings TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON driver_schedules TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_scheduled_trips" ON scheduled_trips;
CREATE POLICY "public_read_scheduled_trips" ON scheduled_trips
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_scheduled_trips" ON scheduled_trips;
CREATE POLICY "public_insert_scheduled_trips" ON scheduled_trips
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_scheduled_trips" ON scheduled_trips;
CREATE POLICY "public_update_scheduled_trips" ON scheduled_trips
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_scheduled_trips" ON scheduled_trips;
CREATE POLICY "public_delete_scheduled_trips" ON scheduled_trips
  FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_read_bookings" ON bookings;
CREATE POLICY "public_read_bookings" ON bookings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_bookings" ON bookings;
CREATE POLICY "public_insert_bookings" ON bookings
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_bookings" ON bookings;
CREATE POLICY "public_update_bookings" ON bookings
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_bookings" ON bookings;
CREATE POLICY "public_delete_bookings" ON bookings
  FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_read_driver_schedules" ON driver_schedules;
CREATE POLICY "public_read_driver_schedules" ON driver_schedules
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_driver_schedules" ON driver_schedules;
CREATE POLICY "public_insert_driver_schedules" ON driver_schedules
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_driver_schedules" ON driver_schedules;
CREATE POLICY "public_update_driver_schedules" ON driver_schedules
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_driver_schedules" ON driver_schedules;
CREATE POLICY "public_delete_driver_schedules" ON driver_schedules
  FOR DELETE TO anon, authenticated USING (true);

-- Sample scheduled trips: staggered departures today on the two seeded routes
INSERT INTO scheduled_trips (route_name, origin, destination, departure_time, arrival_time, bus_plate, capacity, seats_booked, fare_rwf, status)
SELECT * FROM (VALUES
  ('Kigali City Center - Kimironko', 'KBC (City Center)', 'Kimironko Market', date_trunc('day', now()) + interval '9 hours', date_trunc('day', now()) + interval '9 hours 35 minutes', 'RAD 001A', 30, 18, 500, 'scheduled'),
  ('Kigali City Center - Kimironko', 'KBC (City Center)', 'Kimironko Market', date_trunc('day', now()) + interval '12 hours', date_trunc('day', now()) + interval '12 hours 35 minutes', 'RAD 002B', 25, 25, 500, 'full'),
  ('Kigali City Center - Kimironko', 'KBC (City Center)', 'Kimironko Market', date_trunc('day', now()) + interval '16 hours', date_trunc('day', now()) + interval '16 hours 35 minutes', 'RAD 001A', 30, 7, 500, 'scheduled'),
  ('Nyabugogo - Kacyiru', 'Nyabugogo Station', 'Kacyiru', date_trunc('day', now()) + interval '10 hours', date_trunc('day', now()) + interval '10 hours 30 minutes', 'RAD 002B', 25, 12, 400, 'scheduled'),
  ('Nyabugogo - Kacyiru', 'Nyabugogo Station', 'Kacyiru', date_trunc('day', now()) + interval '15 hours', date_trunc('day', now()) + interval '15 hours 30 minutes', 'RAD 001A', 30, 0, 400, 'scheduled')
) AS seed_trips
WHERE NOT EXISTS (SELECT 1 FROM scheduled_trips);

-- Sample driver profiles and schedules for today + tomorrow
INSERT INTO driver_schedules (driver_name, driver_username, phone, route_name, bus_plate, shift_date, start_time, end_time, status)
SELECT * FROM (VALUES
  ('Jean Baptiste Nkurunziza', 'driver1', '+250 788 123 456', 'Kigali City Center - Kimironko', 'RAD 001A', (CURRENT_DATE)::date, '08:00'::time, '14:00'::time, 'on_duty'),
  ('Jean Baptiste Nkurunziza', 'driver1', '+250 788 123 456', 'Nyabugogo - Kacyiru', 'RAD 002B', (CURRENT_DATE + 1)::date, '08:00'::time, '14:00'::time, 'scheduled'),
  ('Aline Mukamana', 'aline', '+250 788 234 567', 'Nyabugogo - Kacyiru', 'RAD 002B', (CURRENT_DATE)::date, '14:00'::time, '20:00'::time, 'scheduled'),
  ('Eric Nshimiyimana', 'eric', '+250 788 345 678', 'Kigali City Center - Kimironko', 'RAD 001A', (CURRENT_DATE)::date, '14:00'::time, '20:00'::time, 'scheduled'),
  ('Claudine Uwase', 'claudine', '+250 788 456 789', 'Nyabugogo - Kacyiru', 'RAD 001A', (CURRENT_DATE)::date, '06:00'::time, '08:00'::time, 'completed'),
  ('Emmanuel Habimana', 'emmanuel', '+250 788 567 890', 'Kigali City Center - Kimironko', 'RAD 002B', (CURRENT_DATE + 1)::date, '06:00'::time, '12:00'::time, 'scheduled'),
  ('Sandrine Ingabire', 'sandrine', '+250 788 678 901', 'Nyabugogo - Kacyiru', 'RAD 002B', (CURRENT_DATE + 1)::date, '12:00'::time, '18:00'::time, 'scheduled')
) AS seed_schedules
WHERE NOT EXISTS (SELECT 1 FROM driver_schedules);