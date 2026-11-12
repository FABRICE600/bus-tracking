/*
# Make seat reservation atomic

1. Plain-English summary
   Previously, reserving a seat wrote the booking and then updated the
   departure's "seats booked" counter in two separate steps. If two passengers
   booked the last seat at the same moment, both could succeed and the bus
   would be overbooked. This migration adds a single database function that
   checks remaining seats, creates the booking, and updates the counter in one
   atomic operation. If not enough seats remain, it returns an error instead.

2. New Functions
   - `reserve_seat(p_trip_id uuid, p_passenger_name text, p_phone text, p_seat_count int)`
     — validates the request, inserts the booking with a generated reference,
     increments the seat counter, and returns the new booking. SECURITY DEFINER
     so anon riders can call it without direct write access being the gate.

3. Security changes
   - Lock down bookings and scheduled_trips writes: anon/authenticated keep
     SELECT (needed to search departures), but INSERT/UPDATE/DELETE grants are
     revoked — all writes now go through the function above.
   - EXECUTE on the new function granted to anon + authenticated; revoked from
     PUBLIC. Function has a pinned search_path.
   - Input validation inside the function: name/phone non-empty, seat count
     1-4, trip must be bookable (not departed/cancelled).
*/

CREATE OR REPLACE FUNCTION reserve_seat(
  p_trip_id uuid,
  p_passenger_name text,
  p_phone text,
  p_seat_count integer
) RETURNS bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip scheduled_trips;
  v_booking bookings;
  v_ref text;
BEGIN
  IF p_passenger_name IS NULL OR trim(p_passenger_name) = '' THEN
    RAISE EXCEPTION 'Passenger name is required';
  END IF;
  IF p_phone IS NULL OR trim(p_phone) = '' THEN
    RAISE EXCEPTION 'Phone number is required';
  END IF;
  IF p_seat_count < 1 OR p_seat_count > 4 THEN
    RAISE EXCEPTION 'Seat count must be between 1 and 4';
  END IF;

  SELECT * INTO v_trip FROM scheduled_trips WHERE id = p_trip_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Departure not found';
  END IF;
  IF v_trip.status NOT IN ('scheduled', 'full') THEN
    RAISE EXCEPTION 'This departure is no longer available';
  END IF;
  IF v_trip.capacity - v_trip.seats_booked < p_seat_count THEN
    RAISE EXCEPTION 'Not enough seats left on this departure';
  END IF;

  v_ref := 'SB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  INSERT INTO bookings (trip_id, passenger_name, phone, seat_count, booking_ref)
  VALUES (p_trip_id, trim(p_passenger_name), trim(p_phone), p_seat_count, v_ref)
  RETURNING * INTO v_booking;

  UPDATE scheduled_trips
  SET seats_booked = seats_booked + p_seat_count,
      status = CASE WHEN seats_booked + p_seat_count >= capacity THEN 'full' ELSE status END
  WHERE id = p_trip_id;

  RETURN v_booking;
END;
$$;

REVOKE EXECUTE ON FUNCTION reserve_seat(uuid, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION reserve_seat(uuid, text, text, integer) TO anon, authenticated;

-- Writes must go through reserve_seat; keep reads open for search
REVOKE INSERT, UPDATE, DELETE ON bookings FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON scheduled_trips FROM anon, authenticated;

DROP POLICY IF EXISTS "public_insert_bookings" ON bookings;
DROP POLICY IF EXISTS "public_update_bookings" ON bookings;
DROP POLICY IF EXISTS "public_delete_bookings" ON bookings;
DROP POLICY IF EXISTS "public_insert_scheduled_trips" ON scheduled_trips;
DROP POLICY IF EXISTS "public_update_scheduled_trips" ON scheduled_trips;
DROP POLICY IF EXISTS "public_delete_scheduled_trips" ON scheduled_trips;