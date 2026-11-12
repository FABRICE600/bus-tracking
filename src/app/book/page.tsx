"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bus, Calendar, MapPin, Search, Ticket, Users, X, CircleCheck as CheckCircle, Clock } from "lucide-react";
import {
  supabase,
  ScheduledTrip,
  formatTime,
  formatFare,
  seatsLeft,
} from "../../lib/supabase";

interface BookingResult {
  ref: string;
  seats: number;
  departure: string;
  route: string;
}

export default function BookPage() {
  const [trips, setTrips] = useState<ScheduledTrip[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [searchFrom, setSearchFrom] = useState("");
  const [searchTo, setSearchTo] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedTrip, setSelectedTrip] = useState<ScheduledTrip | null>(null);
  const [passengerName, setPassengerName] = useState("");
  const [phone, setPhone] = useState("");
  const [seatCount, setSeatCount] = useState(1);
  const [reserving, setReserving] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [confirmation, setConfirmation] = useState<BookingResult | null>(null);

  useEffect(() => {
    supabase
      .from("scheduled_trips")
      .select("*")
      .in("status", ["scheduled", "full"])
      .gte(
        "departure_time",
        new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
      )
      .order("departure_time", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          setLoadError("Could not load departures. Please try again.");
          setTrips([]);
        } else {
          setTrips(data ?? []);
        }
      });
  }, []);

  const origins = useMemo(
    () => Array.from(new Set((trips ?? []).map((t) => t.origin))),
    [trips]
  );
  const destinations = useMemo(
    () => Array.from(new Set((trips ?? []).map((t) => t.destination))),
    [trips]
  );

  const filtered = useMemo(() => {
    if (!trips) return [];
    return trips.filter((t) => {
      if (searchFrom && t.origin !== searchFrom) return false;
      if (searchTo && t.destination !== searchTo) return false;
      if (dateFilter && !t.departure_time.startsWith(dateFilter)) return false;
      return true;
    });
  }, [trips, searchFrom, searchTo, dateFilter]);

  const openBooking = (trip: ScheduledTrip) => {
    setSelectedTrip(trip);
    setBookingError("");
    setPassengerName("");
    setPhone("");
    setSeatCount(1);
    setConfirmation(null);
  };

  const handleReserve = async () => {
    if (!selectedTrip) return;
    if (!passengerName.trim() || !phone.trim()) {
      setBookingError("Please enter your name and phone number");
      return;
    }
    if (seatsLeft(selectedTrip) < seatCount) {
      setBookingError("Not enough seats left on this departure");
      return;
    }

    setReserving(true);
    setBookingError("");

    const { data: booking, error: bookingError } = await supabase.rpc(
      "reserve_seat",
      {
        p_trip_id: selectedTrip.id,
        p_passenger_name: passengerName.trim(),
        p_phone: phone.trim(),
        p_seat_count: seatCount,
      }
    );

    if (bookingError || !booking) {
      setBookingError(
        bookingError?.message ?? "Booking failed. Please try again."
      );
      setReserving(false);
      return;
    }

    setConfirmation({
      ref: booking.booking_ref,
      seats: booking.seat_count,
      departure: selectedTrip.departure_time,
      route: `${selectedTrip.origin} to ${selectedTrip.destination}`,
    });
    setTrips(
      (prev) =>
        prev?.map((t) =>
          t.id === selectedTrip.id
            ? {
                ...t,
                seats_booked: t.seats_booked + seatCount,
                status:
                  t.seats_booked + seatCount >= t.capacity ? "full" : t.status,
              }
            : t
        ) ?? null
    );
    setSelectedTrip(null);
    setReserving(false);
  };

  return (
    <>
      <header className="header">
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "white",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={20} />
          Back
        </Link>
        <div className="header-title">
          <Ticket size={20} className="header-logo" />
          <span>Book a Seat</span>
        </div>
      </header>

      <div className="page">
        {/* Confirmation banner */}
        {confirmation && (
          <div
            className="card"
            style={{
              marginBottom: 20,
              borderColor: "var(--primary)",
              background: "#ECFDF5",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <CheckCircle size={20} style={{ color: "var(--primary)" }} />
              <span style={{ fontWeight: 700 }}>Booking confirmed!</span>
              <button
                onClick={() => setConfirmation(null)}
                style={{
                  marginLeft: "auto",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              <div>
                Reference:{" "}
                <strong style={{ fontSize: 16 }}>{confirmation.ref}</strong>
              </div>
              <div style={{ color: "var(--text-muted)" }}>
                {confirmation.route}
              </div>
              <div style={{ color: "var(--text-muted)" }}>
                {formatTime(confirmation.departure)} • {confirmation.seats}{" "}
                seat{confirmation.seats > 1 ? "s" : ""} reserved
              </div>
            </div>
          </div>
        )}

        {/* Search panel */}
        <div className="card" style={{ marginBottom: 20 }}>
          <label className="label">Search departures</label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <select
              className="select"
              value={searchFrom}
              onChange={(e) => setSearchFrom(e.target.value)}
            >
              <option value="">From: anywhere</option>
              {origins.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <select
              className="select"
              value={searchTo}
              onChange={(e) => setSearchTo(e.target.value)}
            >
              <option value="">To: anywhere</option>
              {destinations.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <input
            className="input"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          {(searchFrom || searchTo || dateFilter) && (
            <button
              onClick={() => {
                setSearchFrom("");
                setSearchTo("");
                setDateFilter("");
              }}
              className="btn btn-secondary btn-block"
              style={{ marginTop: 8, minHeight: 40, fontSize: 13 }}
            >
              Clear search
            </button>
          )}
        </div>

        {/* Results */}
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
          Available Departures ({filtered.length})
        </h2>

        {!trips ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 110 }} />
            ))}
          </div>
        ) : loadError ? (
          <div className="empty-state">
            <p>{loadError}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Search size={48} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <p>No departures match your search</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((trip) => {
              const left = seatsLeft(trip);
              const soldOut = left === 0 || trip.status === "full";
              return (
                <div key={trip.id} className="card">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 10,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 15,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <MapPin size={14} style={{ color: "var(--primary)" }} />
                        {trip.origin} → {trip.destination}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--text-muted)",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          marginTop: 6,
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Clock size={12} />
                          {formatTime(trip.departure_time)}
                        </span>
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Bus size={12} />
                          {trip.bus_plate}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 17,
                          color: "var(--primary)",
                        }}
                      >
                        {formatFare(trip.fare_rwf)}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        color: soldOut ? "var(--danger)" : "var(--primary-dark)",
                      }}
                    >
                      <Users size={14} />
                      {soldOut
                        ? "Fully booked"
                        : `${left} seat${left > 1 ? "s" : ""} left`}
                    </span>
                    <button
                      className="btn btn-primary"
                      disabled={soldOut}
                      onClick={() => openBooking(trip)}
                      style={{
                        padding: "8px 20px",
                        minHeight: 40,
                        fontSize: 14,
                        opacity: soldOut ? 0.5 : 1,
                        cursor: soldOut ? "not-allowed" : "pointer",
                      }}
                    >
                      {soldOut ? "Sold Out" : "Reserve Seats"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Booking modal */}
      {selectedTrip && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedTrip(null)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h3 className="modal-title" style={{ margin: 0 }}>
                Reserve Seats
              </h3>
              <button
                onClick={() => setSelectedTrip(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                background: "var(--bg)",
                borderRadius: "var(--radius-sm)",
                padding: 12,
                marginBottom: 16,
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              <div style={{ fontWeight: 700 }}>
                {selectedTrip.origin} → {selectedTrip.destination}
              </div>
              <div style={{ color: "var(--text-muted)" }}>
                {new Date(selectedTrip.departure_time).toLocaleDateString(
                  "en-GB",
                  { weekday: "short", day: "numeric", month: "short" }
                )}{" "}
                • Departs {formatTime(selectedTrip.departure_time)}
              </div>
              <div style={{ color: "var(--text-muted)" }}>
                Bus {selectedTrip.bus_plate} •{" "}
                {formatFare(selectedTrip.fare_rwf)} per seat
              </div>
            </div>

            {bookingError && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  background: "#FEF2F2",
                  color: "#DC2626",
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 16,
                }}
              >
                {bookingError}
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label className="label">Your Name</label>
              <input
                className="input"
                placeholder="e.g., Alice Uwase"
                value={passengerName}
                onChange={(e) => setPassengerName(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="label">Phone Number</label>
              <input
                className="input"
                type="tel"
                placeholder="e.g., +250 788 000 000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="label">Seats (max 4)</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => setSeatCount(n)}
                    disabled={n > seatsLeft(selectedTrip)}
                    className="btn"
                    style={{
                      flex: 1,
                      background:
                        seatCount === n ? "var(--primary)" : "var(--bg)",
                      color: seatCount === n ? "white" : "var(--text)",
                      border: `1px solid ${
                        seatCount === n ? "var(--primary)" : "var(--border)"
                      }`,
                      minHeight: 44,
                      opacity: n > seatsLeft(selectedTrip) ? 0.4 : 1,
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 700,
                fontSize: 16,
                marginBottom: 16,
                padding: "12px 16px",
                background: "#ECFDF5",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <span>Total</span>
              <span style={{ color: "var(--primary)" }}>
                {formatFare(selectedTrip.fare_rwf * seatCount)}
              </span>
            </div>

            <button
              onClick={handleReserve}
              disabled={reserving}
              className="btn btn-primary btn-block btn-large"
            >
              <Ticket size={18} />
              {reserving ? "Reserving..." : "Confirm Reservation"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
