"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Link from "next/link";
import { use, useMemo } from "react";
import { ArrowLeft, Bus, MapPin, Clock, Navigation, Map as MapIcon } from "lucide-react";

// Haversine distance in km
function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate ETA in minutes based on distance and speed
function calculateETA(
  busLat: number,
  busLng: number,
  stopLat: number,
  stopLng: number,
  speedKmh: number
): number {
  const distance = haversine(busLat, busLng, stopLat, stopLng);
  const avgSpeed = speedKmh > 0 ? speedKmh : 20; // Default 20 km/h for city buses in Kigali
  return Math.round((distance / avgSpeed) * 60);
}

export default function RoutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const route = useQuery(api.routes.get, { id: id as Id<"routes"> });
  const activeTrips = useQuery(api.trips.getActiveTripsForRoute, {
    routeId: id as Id<"routes">,
  });

  const busData = useMemo(() => {
    if (!activeTrips || !route) return [];
    return activeTrips
      .filter((t) => t.lastLat && t.lastLng)
      .map((trip) => {
        const stopETAs = route.stops.map((stop) => ({
          ...stop,
          eta: calculateETA(
            trip.lastLat!,
            trip.lastLng!,
            stop.lat,
            stop.lng,
            trip.lastSpeed || 20
          ),
          distance: haversine(trip.lastLat!, trip.lastLng!, stop.lat, stop.lng),
        }));

        const nearestStop = [...stopETAs].sort((a, b) => a.distance - b.distance)[0];

        return {
          tripId: trip._id,
          bus: trip.bus,
          lat: trip.lastLat!,
          lng: trip.lastLng!,
          speed: trip.lastSpeed || 0,
          heading: trip.lastHeading || 0,
          lastUpdate: trip.lastLocationTime,
          nearestStop,
          stopETAs,
        };
      });
  }, [activeTrips, route]);

  if (!route) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 300, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 40, marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="header">
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "var(--text)",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={20} />
          Back
        </Link>
      </header>

      <div className="page">
        {/* Route name */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div
              className="route-color-dot"
              style={{ backgroundColor: route.color || "#3B82F6" }}
            />
            <h1 style={{ fontSize: 20, fontWeight: 800 }}>{route.name}</h1>
          </div>
          {route.description && (
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              {route.description}
            </p>
          )}
        </div>

        {/* Map placeholder */}
        <Link
          href={`/route/${id}/map`}
          className="map-container map-container-full"
          style={{
            background: "#E8F5E9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 8,
            marginBottom: 16,
            position: "relative",
            textDecoration: "none",
          }}
        >
          <div style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 8
          }}>
            <Navigation size={32} style={{ color: "var(--primary)", opacity: 0.5 }} />
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              See buses and stops plotted on a live map
            </p>
            <span
              className="btn btn-primary"
              style={{ padding: "8px 16px", minHeight: "auto", fontSize: 13 }}
            >
              <MapIcon size={14} /> View Live Map
            </span>
          </div>

          {/* Show bus markers as overlays */}
          {busData.map((bus, i) => (
            <div
              key={bus.tripId}
              style={{
                position: "absolute",
                top: `${30 + i * 50}px`,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 10,
                background: "white",
                padding: "6px 10px",
                borderRadius: 8,
                boxShadow: "var(--shadow-md)",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
              }}
            >
              <Bus size={14} style={{ color: "var(--primary)" }} />
              <span style={{ fontWeight: 600 }}>{bus.bus?.plate}</span>
              <span style={{ color: "var(--text-muted)" }}>
                {bus.speed.toFixed(0)} km/h
              </span>
            </div>
          ))}
        </Link>

        {/* Active buses */}
        {busData.length > 0 ? (
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Bus size={18} />
                Active Buses ({busData.length})
              </span>
            </h2>
            {busData.map((bus) => (
              <div key={bus.tripId} className="card" style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Bus size={18} style={{ color: "var(--primary)" }} />
                    <span style={{ fontWeight: 700, fontSize: 15 }}>
                      {bus.bus?.plate}
                    </span>
                  </div>
                  <span className="badge badge-active">
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#059669", display: "inline-block" }} />
                    Live
                  </span>
                </div>

                {bus.nearestStop && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>Next stop</div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <MapPin size={14} style={{ color: "var(--primary)" }} />
                          {bus.nearestStop.name}
                        </span>
                      </div>
                    </div>
                    <div className="eta-display">
                      <span className="eta-number">{bus.nearestStop.eta}</span>
                      <span className="eta-unit">min</span>
                    </div>
                  </div>
                )}

                {bus.lastUpdate && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
                    <Clock size={10} style={{ display: "inline", marginRight: 4 }} />
                    Updated {Math.round((Date.now() - bus.lastUpdate) / 1000)}s ago
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ textAlign: "center", padding: 24, marginBottom: 20 }}>
            <Bus size={32} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
            <p style={{ fontWeight: 600, marginBottom: 4 }}>No active buses</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              No buses are currently running on this route
            </p>
          </div>
        )}

        {/* Stops list */}
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <MapPin size={18} />
            Route Stops
          </span>
        </h2>
        <div className="card">
          {route.stops
            .sort((a, b) => a.order - b.order)
            .map((stop, i) => {
              const isLast = i === route.stops.length - 1;

              // Get ETA from nearest bus
              let eta: number | null = null;
              if (busData.length > 0) {
                const closestBus = busData[0];
                const stopETA = closestBus.stopETAs.find(
                  (s) => s.name === stop.name
                );
                if (stopETA) eta = stopETA.eta;
              }

              return (
                <div key={i} className="stop-item">
                  <div className="stop-timeline">
                    <div className={`stop-circle ${i === 0 ? "active" : ""}`} />
                    {!isLast && <div className="stop-line" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{stop.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Stop {stop.order}
                    </div>
                  </div>
                  {eta !== null && eta > 0 && (
                    <div className="eta-display" style={{ fontSize: 14 }}>
                      <span className="eta-number" style={{ fontSize: 20 }}>{eta}</span>
                      <span className="eta-unit" style={{ fontSize: 11 }}>min</span>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </>
  );
}
