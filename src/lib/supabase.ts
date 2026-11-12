import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key"
);

export interface ScheduledTrip {
  id: string;
  route_name: string;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  bus_plate: string;
  capacity: number;
  seats_booked: number;
  fare_rwf: number;
  status: string;
}

export interface Booking {
  id: string;
  trip_id: string;
  passenger_name: string;
  phone: string;
  seat_count: number;
  booking_ref: string;
  created_at: string;
}

export interface DriverSchedule {
  id: string;
  driver_name: string;
  driver_username: string;
  phone: string;
  route_name: string;
  bus_plate: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

export interface RouteStop {
  name: string;
  lat: number;
  lng: number;
  order: number;
}

export function seatsLeft(trip: ScheduledTrip): number {
  return Math.max(0, trip.capacity - trip.seats_booked);
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatFare(rwf: number): string {
  return `${rwf.toLocaleString()} RWF`;
}
