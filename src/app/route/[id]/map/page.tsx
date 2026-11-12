"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Link from "next/link";
import { use, useCallback } from "react";
import { ArrowLeft, Bus, MapPin, Minus, Plus, Crosshair } from "lucide-react";

interface Stop {
  name: string;
  lat: number;
  lng: number;
  order: number;
}

interface LiveBus {
  tripId: string;
  plate: string;
  lat: number;
  lng: number;
  speed: number;
}

// Project lat/lng to flat x/y (equirectangular, scaled around route centroid)
function project(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  scale: number
): { x: number; y: number } {
  const x = (lng - centerLng) * scale * Math.cos((centerLat * Math.PI) / 180);
  const y = -(lat - centerLat) * scale;
  return { x, y };
}

export default function MapView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const route = useQuery(api.routes.get, { id: id as Id<"routes"> });
  const activeTrips = useQuery(api.trips.getActiveTripsForRoute, {
    routeId: id as Id<"routes">,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const stops: Stop[] = useMemo(
    () => (route ? [...route.stops].sort((a, b) => a.order - b.order) : []),
    [route]
  );

  const buses: LiveBus[] = useMemo(
    () =>
      (activeTrips ?? [])
        .filter((t) => t.lastLat != null && t.lastLng != null)
        .map((t) => ({
          tripId: t._id,
          plate: t.bus?.plate ?? "Bus",
          lat: t.lastLat!,
          lng: t.lastLng!,
          speed: t.lastSpeed || 0,
        })),
    [activeTrips]
  );

  const bounds = useMemo(() => {
    const points = [...stops, ...buses.map((b) => ({ lat: b.lat, lng: b.lng }))];
    if (points.length === 0) return null;
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };
  }, [stops, buses]);

  const center = useMemo(() => {
    if (!bounds) return { lat: -1.9441, lng: 30.0619 };
    return {
      lat: (bounds.minLat + bounds.maxLat) / 2,
      lng: (bounds.minLng + bounds.maxLng) / 2,
    };
  }, [bounds]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bounds) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const spanLat = Math.max(bounds.maxLat - bounds.minLat, 0.01);
    const spanLng = Math.max(bounds.maxLng - bounds.minLng, 0.01);
    const scale = Math.min(rect.width / (spanLng * 1.5), rect.height / (spanLat * 1.5)) * zoom;
    const px = pan.x + rect.width / 2;
    const py = pan.y + rect.height / 2;

    const toScreen = (lat: number, lng: number) => {
      const p = project(lat, lng, center.lat, center.lng, scale);
      return { x: p.x + px, y: p.y + py };
    };

    // Grid backdrop
    ctx.strokeStyle = "rgba(5, 150, 105, 0.08)";
    ctx.lineWidth = 1;
    for (let gx = 0; gx < rect.width; gx += 40) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, rect.height);
      ctx.stroke();
    }
    for (let gy = 0; gy < rect.height; gy += 40) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(rect.width, gy);
      ctx.stroke();
    }

    // Route line through stops
    if (stops.length > 1) {
      ctx.strokeStyle = route?.color || "#059669";
      ctx.lineWidth = 4;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      stops.forEach((s, i) => {
        const pt = toScreen(s.lat, s.lng);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
    }

    // Stops
    stops.forEach((s) => {
      const pt = toScreen(s.lat, s.lng);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = "white";
      ctx.fill();
      ctx.strokeStyle = route?.color || "#059669";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.font = "600 11px Inter, sans-serif";
      ctx.fillStyle = "#0F172A";
      ctx.textAlign = "center";
      const label = s.name.length > 18 ? s.name.slice(0, 17) + "…" : s.name;
      const width = ctx.measureText(label).width + 10;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fillRect(pt.x - width / 2, pt.y + 10, width, 16);
      ctx.fillStyle = "#0F172A";
      ctx.fillText(label, pt.x, pt.y + 22);
    });

    // Buses
    buses.forEach((b) => {
      const pt = toScreen(b.lat, b.lng);
      // Pulse ring
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(5, 150, 105, 0.2)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 9, 0, Math.PI * 2);
      ctx.fillStyle = "#059669";
      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Plate tag
      ctx.font = "700 11px Inter, sans-serif";
      ctx.textAlign = "center";
      const tag = `${b.plate} · ${b.speed.toFixed(0)} km/h`;
      const w = ctx.measureText(tag).width + 12;
      ctx.fillStyle = "#0F172A";
      ctx.beginPath();
      ctx.roundRect(pt.x - w / 2, pt.y - 34, w, 20, 6);
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.fillText(tag, pt.x, pt.y - 20);
    });
  }, [bounds, stops, buses, zoom, pan, center, route]);

  useEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [draw]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    setPan({
      x: dragRef.current.panX + (e.clientX - dragRef.current.x),
      y: dragRef.current.panY + (e.clientY - dragRef.current.y),
    });
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  if (!route) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 400, marginBottom: 16 }} />
      </div>
    );
  }

  return (
    <>
      <header className="header">
        <Link
          href={`/route/${id}`}
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
          <MapPin size={20} className="header-logo" />
          <span style={{ fontSize: 16 }}>Live Map</span>
        </div>
      </header>

      <div className="page" style={{ maxWidth: 720 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <div
            className="route-color-dot"
            style={{ backgroundColor: route.color || "#059669" }}
          />
          <h1 style={{ fontSize: 18, fontWeight: 800, flex: 1 }}>
            {route.name}
          </h1>
          <span
            className="badge badge-active"
            style={{ whiteSpace: "nowrap" }}
          >
            <Bus size={12} />
            {buses.length} live
          </span>
        </div>

        {/* Map canvas */}
        <div
          style={{
            position: "relative",
            borderRadius: "var(--radius)",
            overflow: "hidden",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-md)",
            background: "#F0FDF4",
          }}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{
              display: "block",
              width: "100%",
              height: "55vh",
              minHeight: 320,
              touchAction: "none",
              cursor: dragRef.current ? "grabbing" : "grab",
            }}
          />

          {/* Zoom controls */}
          <div
            style={{
              position: "absolute",
              right: 12,
              top: 12,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <button
              onClick={() => setZoom((z) => Math.min(z * 1.3, 5))}
              className="btn"
              style={{
                width: 40,
                height: 40,
                minHeight: "auto",
                padding: 0,
                background: "white",
                color: "var(--text)",
                boxShadow: "var(--shadow-md)",
              }}
              aria-label="Zoom in"
            >
              <Plus size={18} />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(z / 1.3, 0.5))}
              className="btn"
              style={{
                width: 40,
                height: 40,
                minHeight: "auto",
                padding: 0,
                background: "white",
                color: "var(--text)",
                boxShadow: "var(--shadow-md)",
              }}
              aria-label="Zoom out"
            >
              <Minus size={18} />
            </button>
            <button
              onClick={resetView}
              className="btn"
              style={{
                width: 40,
                height: 40,
                minHeight: "auto",
                padding: 0,
                background: "white",
                color: "var(--primary)",
                boxShadow: "var(--shadow-md)",
              }}
              aria-label="Reset view"
            >
              <Crosshair size={18} />
            </button>
          </div>

          {buses.length === 0 && (
            <div
              style={{
                position: "absolute",
                bottom: 12,
                left: 12,
                right: 12,
                background: "rgba(255,255,255,0.95)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 12px",
                fontSize: 12,
                color: "var(--text-muted)",
                textAlign: "center",
              }}
            >
              No buses on this route right now — showing stops only
            </div>
          )}
        </div>

        <p
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            textAlign: "center",
            margin: "8px 0 20px",
          }}
        >
          Drag to pan · buttons to zoom · updates live as buses report
        </p>

        {/* Stop legend */}
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
          Stops on this route
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {stops.map((s) => (
            <button
              key={s.order}
              onClick={() => setSelectedStop(selectedStop?.name === s.name ? null : s)}
              className="card"
              style={{
                textAlign: "left",
                cursor: "pointer",
                borderColor:
                  selectedStop?.name === s.name ? "var(--primary)" : undefined,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  className="stop-circle"
                  style={{
                    width: 12,
                    height: 12,
                    background: "var(--primary)",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      fontFamily: "monospace",
                    }}
                  >
                    {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                  </div>
                </div>
              </div>
              {selectedStop?.name === s.name && (
                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: "1px solid var(--border)",
                    fontSize: 13,
                    color: "var(--text-muted)",
                  }}
                >
                  Buses currently near this stop:{" "}
                  <strong>
                    {
                      buses.filter(
                        (b) =>
                          Math.abs(b.lat - s.lat) < 0.005 &&
                          Math.abs(b.lng - s.lng) < 0.005
                      ).length
                    }
                  </strong>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
