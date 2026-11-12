"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "../providers";
import { useRouter } from "next/navigation";
import {
  Bus,
  Play,
  Square,
  Navigation,
  Wifi,
  WifiOff,
  LogOut,
  MapPin,
  Gauge,
  Calendar,
  Phone,
} from "lucide-react";
import { supabase, DriverSchedule } from "../../lib/supabase";

export default function DriverPage() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [selectedBus, setSelectedBus] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [locationCount, setLocationCount] = useState(0);
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number; speed: number; heading: number } | null>(null);
  const [schedules, setSchedules] = useState<DriverSchedule[] | null>(null);

  const buses = useQuery(api.buses.list);
  const routes = useQuery(api.routes.list);
  const activeTrip = useQuery(
    api.trips.getActiveTripForDriver,
    user ? { driverId: user.id as Id<"users"> } : "skip"
  );

  const startTrip = useMutation(api.trips.startTrip);
  const endTrip = useMutation(api.trips.endTrip);
  const updateLocation = useMutation(api.trips.updateLocation);

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load all driver schedules for the roster panel
  useEffect(() => {
    supabase
      .from("driver_schedules")
      .select("*")
      .gte("shift_date", new Date().toISOString().slice(0, 10))
      .order("shift_date", { ascending: true })
      .order("start_time", { ascending: true })
      .then(({ data }) => setSchedules(data ?? []));
  }, []);

  // Redirect if not driver
  useEffect(() => {
    if (!isLoading && (!user || user.role !== "driver")) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // GPS tracking for active trip
  const sendLocation = useCallback(async () => {
    if (!activeTrip || !lastPositionRef.current) return;
    try {
      await updateLocation({
        tripId: activeTrip._id,
        lat: lastPositionRef.current.lat,
        lng: lastPositionRef.current.lng,
        speed: lastPositionRef.current.speed,
        heading: lastPositionRef.current.heading,
      });
      setLocationCount((c) => c + 1);
    } catch {
      // Silently fail — will retry next interval
    }
  }, [activeTrip, updateLocation]);

  useEffect(() => {
    if (!activeTrip) {
      // Clean up if trip ended
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start watching position
    if (watchIdRef.current === null && "geolocation" in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          lastPositionRef.current = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            speed: (pos.coords.speed || 0) * 3.6, // m/s to km/h
            heading: pos.coords.heading || 0,
          };
          setCurrentSpeed((pos.coords.speed || 0) * 3.6);
          setGpsError("");
        },
        (err) => {
          setGpsError(
            err.code === 1
              ? "Location permission denied. Please enable GPS."
              : "Unable to get location. Check GPS settings."
          );
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000,
        }
      );
    }

    // Send location every 10 seconds
    if (!intervalRef.current) {
      intervalRef.current = setInterval(sendLocation, 10000);
      // Also send immediately
      sendLocation();
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [activeTrip, sendLocation]);

  const handleStartTrip = async () => {
    if (!selectedBus || !selectedRoute || !user) return;
    setIsStarting(true);
    try {
      await startTrip({
        busId: selectedBus as Id<"buses">,
        driverId: user.id as Id<"users">,
        routeId: selectedRoute as Id<"routes">,
      });
      setLocationCount(0);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to start trip");
    } finally {
      setIsStarting(false);
    }
  };

  const handleEndTrip = async () => {
    if (!activeTrip) return;
    setIsStopping(true);
    try {
      await endTrip({ tripId: activeTrip._id });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to end trip");
    } finally {
      setIsStopping(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="page" style={{ paddingTop: 40 }}>
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  if (!user) return null;

  // Active trip — driving mode
  if (activeTrip) {
    return (
      <div className="driving-screen">
        {/* Connection status */}
        <div className={`connection-bar ${isOnline ? "online" : "offline"}`}>
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          {isOnline ? "Connected" : "No Connection — updates will queue"}
        </div>

        <div className="driving-header">
          <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 4 }}>
            {activeTrip.route?.name}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            🚌 {activeTrip.bus?.plate}
          </div>
        </div>

        <div className="driving-body">
          {gpsError ? (
            <div
              style={{
                background: "rgba(255,255,255,0.15)",
                padding: 16,
                borderRadius: 12,
                textAlign: "center",
              }}
            >
              <Navigation size={32} style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 14 }}>{gpsError}</p>
            </div>
          ) : (
            <>
              <div className="driving-pulse">
                <Navigation size={48} />
              </div>

              <div style={{ textAlign: "center" }}>
                <div className="driving-speed">{currentSpeed.toFixed(0)}</div>
                <div className="driving-label">km/h</div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 24,
                  fontSize: 13,
                  opacity: 0.8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <MapPin size={14} />
                  {locationCount} updates sent
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Gauge size={14} />
                  Every 10s
                </div>
              </div>
            </>
          )}

          <button
            onClick={handleEndTrip}
            disabled={isStopping}
            className="btn btn-danger btn-large btn-block"
            style={{ marginTop: 24, maxWidth: 300 }}
          >
            <Square size={20} />
            {isStopping ? "Ending Trip..." : "End Trip"}
          </button>
        </div>
      </div>
    );
  }

  // Trip selection screen
  return (
    <>
      <header className="header">
        <div className="header-title">
          <Bus size={22} className="header-logo" />
          <span>Driver</span>
        </div>
        <button
          onClick={handleLogout}
          className="btn btn-secondary"
          style={{ padding: "8px 12px", minHeight: "auto", fontSize: 13 }}
        >
          <LogOut size={14} />
          Logout
        </button>
      </header>

      <div className="page">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
            Hello, {user.name} 👋
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Select your bus and route to start driving
          </p>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <label className="label">Select Bus</label>
            <select
              className="select"
              value={selectedBus}
              onChange={(e) => setSelectedBus(e.target.value)}
            >
              <option value="">Choose a bus...</option>
              {buses
                ?.filter((b) => b.status !== "maintenance")
                .map((bus) => (
                  <option key={bus._id} value={bus._id}>
                    {bus.plate} — {bus.model || "Bus"}
                  </option>
                ))}
            </select>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label className="label">Select Route</label>
            <select
              className="select"
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
            >
              <option value="">Choose a route...</option>
              {routes
                ?.filter((r) => r.isActive)
                .map((route) => (
                  <option key={route._id} value={route._id}>
                    {route.name}
                  </option>
                ))}
            </select>
          </div>

          <button
            onClick={handleStartTrip}
            disabled={!selectedBus || !selectedRoute || isStarting}
            className="btn btn-primary btn-large btn-block"
          >
            <Play size={20} />
            {isStarting ? "Starting..." : "Start Trip"}
          </button>
        </div>

        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: "var(--radius-sm)",
            background: "#F0FDF4",
            fontSize: 13,
            color: "#059669",
          }}
        >
          💡 Make sure your GPS is enabled before starting a trip
        </div>

        {/* Driver roster & schedule */}
        <div style={{ marginTop: 28 }}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Calendar size={18} />
            Team Schedules
          </h2>

          {!schedules ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: 80 }} />
              ))}
            </div>
          ) : schedules.length === 0 ? (
            <div className="empty-state">
              <Calendar size={48} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
              <p>No shifts scheduled yet</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {schedules.map((s) => {
                const isToday = s.shift_date === new Date().toISOString().slice(0, 10);
                return (
                  <div key={s.id} className="card">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 6,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>
                          {s.driver_name}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: "var(--text-muted)",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            marginTop: 2,
                          }}
                        >
                          <Phone size={11} />
                          {s.phone}
                        </div>
                      </div>
                      <span
                        className={`badge ${
                          s.status === "on_duty"
                            ? "badge-active"
                            : s.status === "completed"
                              ? "badge-idle"
                              : "badge-idle"
                        }`}
                      >
                        {isToday ? "Today" : "Tomorrow"} ·{" "}
                        {s.status === "on_duty"
                          ? "On duty"
                          : s.status === "completed"
                            ? "Done"
                            : "Scheduled"}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--text-muted)",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 10,
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <MapPin size={12} />
                        {s.route_name}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Bus size={12} />
                        {s.bus_plate}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Calendar size={12} />
                        {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
