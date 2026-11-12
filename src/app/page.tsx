"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";
import { Bus, MapPin, Clock, ChevronRight, Ticket } from "lucide-react";

export default function HomePage() {
  const routes = useQuery(api.routes.list);
  const activeTrips = useQuery(api.trips.getActiveTrips);

  const activeBusCountForRoute = (routeId: string) => {
    if (!activeTrips) return 0;
    return activeTrips.filter((t) => t.routeId === routeId).length;
  };

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="header-title">
          <Bus size={22} className="header-logo" />
          <span>SafariBus</span>
        </div>
        <Link href="/login" className="btn btn-secondary" style={{ padding: "8px 16px", minHeight: "auto", fontSize: "13px" }}>
          Login
        </Link>
      </header>

      <div className="page">
        {/* Hero */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
            Track Your Bus
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 15 }}>
            See live bus locations and arrival times
          </p>
        </div>

        {/* Booking entry */}
        <Link
          href="/book"
          className="route-card"
          style={{
            marginBottom: 24,
            borderColor: "var(--primary)",
            borderWidth: 2,
            background: "linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 100%)",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Ticket size={22} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
              Book a Seat
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Search departures and reserve your seat
            </div>
          </div>
          <ChevronRight size={18} style={{ color: "var(--text-muted)" }} />
        </Link>

        {/* Quick stats */}
        {activeTrips && (
          <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
            <div className="card" style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--primary)" }}>
                {activeTrips.length}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Active Buses</div>
            </div>
            <div className="card" style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent)" }}>
                {routes?.length || 0}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Routes</div>
            </div>
          </div>
        )}

        {/* Routes list */}
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
          Available Routes
        </h2>

        {!routes ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 80 }} />
            ))}
          </div>
        ) : routes.length === 0 ? (
          <div className="empty-state">
            <MapPin size={48} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <p>No routes available yet</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {routes
              .filter((r) => r.isActive)
              .map((route) => {
                const busCount = activeBusCountForRoute(route._id);
                return (
                  <Link
                    key={route._id}
                    href={`/route/${route._id}`}
                    className="route-card"
                  >
                    <div
                      className="route-color-dot"
                      style={{ backgroundColor: route.color || "#3B82F6" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>
                        {route.name}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <MapPin size={12} />
                          {route.stops.length} stops
                        </span>
                        {busCount > 0 && (
                          <span className="badge badge-active" style={{ fontSize: 11 }}>
                            <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#059669", display: "inline-block" }} />
                            {busCount} bus{busCount > 1 ? "es" : ""} active
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={18} style={{ color: "var(--text-muted)" }} />
                  </Link>
                );
              })}
          </div>
        )}

        {/* Footer info */}
        <div style={{ marginTop: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <Clock size={12} />
            <span>Updates every 10 seconds</span>
          </div>
        </div>
      </div>
    </>
  );
}
