"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "../providers";
import { useRouter } from "next/navigation";
import {
  Bus,
  MapPin,
  Users,
  Route as RouteIcon,
  Plus,
  Trash2,
  LogOut,
  Activity,
  X,
  Settings,
} from "lucide-react";

type Tab = "overview" | "routes" | "buses" | "drivers";

export default function AdminPage() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showModal, setShowModal] = useState<string | null>(null);

  // Queries
  const routes = useQuery(api.routes.list);
  const buses = useQuery(api.buses.list);
  const drivers = useQuery(api.auth.listDrivers);
  const users = useQuery(api.auth.listUsers);
  const activeTrips = useQuery(api.trips.getActiveTrips);

  // Mutations
  const createRoute = useMutation(api.routes.create);
  const removeRoute = useMutation(api.routes.remove);
  const createBus = useMutation(api.buses.create);
  const removeBus = useMutation(api.buses.remove);
  const createUser = useMutation(api.auth.createUser);
  const seedData = useMutation(api.seed.seedData);

  // Form states
  const [routeForm, setRouteForm] = useState({
    name: "",
    description: "",
    stops: [{ name: "", lat: "", lng: "", order: 1 }],
    color: "#10B981",
  });
  const [busForm, setBusForm] = useState({ plate: "", model: "", capacity: "" });
  const [driverForm, setDriverForm] = useState({
    username: "",
    password: "",
    name: "",
  });

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="page page-wide" style={{ paddingTop: 40 }}>
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    );
  }

  const handleSeed = async () => {
    try {
      const result = await seedData();
      alert(typeof result === "string" ? result : "Seed data created!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Seeding failed");
    }
  };

  const handleCreateRoute = async () => {
    try {
      const stops = routeForm.stops
        .filter((s) => s.name && s.lat && s.lng)
        .map((s, i) => ({
          name: s.name,
          lat: parseFloat(s.lat),
          lng: parseFloat(s.lng),
          order: i + 1,
        }));

      if (!routeForm.name || stops.length < 2) {
        alert("Route needs a name and at least 2 stops");
        return;
      }

      await createRoute({
        name: routeForm.name,
        description: routeForm.description || undefined,
        stops,
        color: routeForm.color,
      });
      setShowModal(null);
      setRouteForm({
        name: "",
        description: "",
        stops: [{ name: "", lat: "", lng: "", order: 1 }],
        color: "#10B981",
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleCreateBus = async () => {
    try {
      if (!busForm.plate) {
        alert("Plate number is required");
        return;
      }
      await createBus({
        plate: busForm.plate,
        model: busForm.model || undefined,
        capacity: busForm.capacity ? parseInt(busForm.capacity) : undefined,
      });
      setShowModal(null);
      setBusForm({ plate: "", model: "", capacity: "" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleCreateDriver = async () => {
    try {
      if (!driverForm.username || !driverForm.password || !driverForm.name) {
        alert("All fields are required");
        return;
      }
      await createUser({
        username: driverForm.username,
        password: driverForm.password,
        name: driverForm.name,
        role: "driver",
      });
      setShowModal(null);
      setDriverForm({ username: "", password: "", name: "" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  const addStopField = () => {
    setRouteForm({
      ...routeForm,
      stops: [
        ...routeForm.stops,
        { name: "", lat: "", lng: "", order: routeForm.stops.length + 1 },
      ],
    });
  };

  const updateStop = (index: number, field: string, value: string) => {
    const newStops = [...routeForm.stops];
    newStops[index] = { ...newStops[index], [field]: value };
    setRouteForm({ ...routeForm, stops: newStops });
  };

  const removeStop = (index: number) => {
    if (routeForm.stops.length <= 1) return;
    setRouteForm({
      ...routeForm,
      stops: routeForm.stops.filter((_, i) => i !== index),
    });
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <Activity size={16} /> },
    { id: "routes", label: "Routes", icon: <RouteIcon size={16} /> },
    { id: "buses", label: "Buses", icon: <Bus size={16} /> },
    { id: "drivers", label: "Drivers", icon: <Users size={16} /> },
  ];

  return (
    <>
      <header className="header">
        <div className="header-title">
          <Settings size={20} className="header-logo" />
          <span>Admin</span>
        </div>
        <button
          onClick={() => {
            logout();
            router.push("/login");
          }}
          className="btn btn-secondary"
          style={{ padding: "8px 12px", minHeight: "auto", fontSize: 13 }}
        >
          <LogOut size={14} />
          Logout
        </button>
      </header>

      <div className="page page-wide">
        {/* Tab navigation */}
        <div className="tab-nav" style={{ marginBottom: 20 }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                {tab.icon}
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            <div className="grid-2" style={{ marginBottom: 20 }}>
              <div className="stat-card">
                <div className="stat-value" style={{ color: "var(--primary)" }}>
                  {activeTrips?.length || 0}
                </div>
                <div className="stat-label">Active Trips</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{buses?.length || 0}</div>
                <div className="stat-label">Total Buses</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{routes?.length || 0}</div>
                <div className="stat-label">Routes</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{drivers?.length || 0}</div>
                <div className="stat-label">Drivers</div>
              </div>
            </div>

            {/* Seed button */}
            <button
              onClick={handleSeed}
              className="btn btn-secondary btn-block"
              style={{ marginBottom: 20 }}
            >
              🌱 Seed Demo Data
            </button>

            {/* Active trips */}
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
              Live Activity
            </h3>
            {activeTrips && activeTrips.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {activeTrips.map((trip) => (
                  <div key={trip._id} className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>
                          🚌 {trip.bus?.plate}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                          {trip.route?.name} • Driver: {trip.driver?.name}
                        </div>
                      </div>
                      <span className="badge badge-active">Active</span>
                    </div>
                    {trip.lastLat && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                        📍 {trip.lastLat.toFixed(4)}, {trip.lastLng?.toFixed(4)} •{" "}
                        {trip.lastSpeed?.toFixed(0) || 0} km/h
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No active trips right now</p>
              </div>
            )}
          </>
        )}

        {/* Routes Tab */}
        {activeTab === "routes" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Routes</h3>
              <button
                className="btn btn-primary"
                style={{ padding: "8px 16px", minHeight: "auto" }}
                onClick={() => setShowModal("route")}
              >
                <Plus size={16} /> Add Route
              </button>
            </div>

            {routes && routes.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {routes.map((route) => (
                  <div key={route._id} className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <div
                            className="route-color-dot"
                            style={{ backgroundColor: route.color || "#3B82F6" }}
                          />
                          <span style={{ fontWeight: 600 }}>{route.name}</span>
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                          {route.stops.length} stops • {route.isActive ? "Active" : "Inactive"}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                          {route.stops.map((s) => s.name).join(" → ")}
                        </div>
                      </div>
                      <button
                        onClick={() => removeRoute({ id: route._id })}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 4 }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <RouteIcon size={48} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                <p>No routes yet. Create one to get started.</p>
              </div>
            )}
          </>
        )}

        {/* Buses Tab */}
        {activeTab === "buses" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Buses</h3>
              <button
                className="btn btn-primary"
                style={{ padding: "8px 16px", minHeight: "auto" }}
                onClick={() => setShowModal("bus")}
              >
                <Plus size={16} /> Add Bus
              </button>
            </div>

            {buses && buses.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {buses.map((bus) => (
                  <div key={bus._id} className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>
                          {bus.plate}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                          {bus.model || "—"} • Seats: {bus.capacity || "—"}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className={`badge ${bus.status === "active" ? "badge-active" : bus.status === "maintenance" ? "badge-danger" : "badge-idle"}`}>
                          {bus.status}
                        </span>
                        <button
                          onClick={() => removeBus({ id: bus._id })}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 4 }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Bus size={48} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                <p>No buses registered</p>
              </div>
            )}
          </>
        )}

        {/* Drivers Tab */}
        {activeTab === "drivers" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Drivers</h3>
              <button
                className="btn btn-primary"
                style={{ padding: "8px 16px", minHeight: "auto" }}
                onClick={() => setShowModal("driver")}
              >
                <Plus size={16} /> Add Driver
              </button>
            </div>

            {users && users.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {users.map((u) => (
                  <div key={u.id} className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{u.name}</div>
                        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                          @{u.username}
                        </div>
                      </div>
                      <span className={`badge ${u.role === "admin" ? "badge-active" : "badge-idle"}`}>
                        {u.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Users size={48} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                <p>No users yet</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {/* Route Modal */}
            {showModal === "route" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 className="modal-title" style={{ margin: 0 }}>Add Route</h3>
                  <button onClick={() => setShowModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                    <X size={20} />
                  </button>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label className="label">Route Name</label>
                  <input
                    className="input"
                    placeholder="e.g., CBD - Remera"
                    value={routeForm.name}
                    onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label className="label">Description</label>
                  <input
                    className="input"
                    placeholder="Optional description"
                    value={routeForm.description}
                    onChange={(e) => setRouteForm({ ...routeForm, description: e.target.value })}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label className="label">Color</label>
                  <input
                    type="color"
                    value={routeForm.color}
                    onChange={(e) => setRouteForm({ ...routeForm, color: e.target.value })}
                    style={{ width: 48, height: 40, border: "none", cursor: "pointer" }}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label className="label">Stops</label>
                  {routeForm.stops.map((stop, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
                      <input
                        className="input"
                        placeholder="Stop name"
                        value={stop.name}
                        onChange={(e) => updateStop(i, "name", e.target.value)}
                        style={{ flex: 2 }}
                      />
                      <input
                        className="input"
                        placeholder="Lat"
                        value={stop.lat}
                        onChange={(e) => updateStop(i, "lat", e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <input
                        className="input"
                        placeholder="Lng"
                        value={stop.lng}
                        onChange={(e) => updateStop(i, "lng", e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button
                        onClick={() => removeStop(i)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 4 }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addStopField}
                    className="btn btn-secondary"
                    style={{ padding: "6px 12px", minHeight: "auto", fontSize: 13 }}
                  >
                    <Plus size={14} /> Add Stop
                  </button>
                </div>

                <button onClick={handleCreateRoute} className="btn btn-primary btn-block" style={{ marginTop: 16 }}>
                  Create Route
                </button>
              </>
            )}

            {/* Bus Modal */}
            {showModal === "bus" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 className="modal-title" style={{ margin: 0 }}>Add Bus</h3>
                  <button onClick={() => setShowModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                    <X size={20} />
                  </button>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label className="label">Plate Number</label>
                  <input
                    className="input"
                    placeholder="e.g., RAD 001A"
                    value={busForm.plate}
                    onChange={(e) => setBusForm({ ...busForm, plate: e.target.value })}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label className="label">Model</label>
                  <input
                    className="input"
                    placeholder="e.g., Toyota Coaster"
                    value={busForm.model}
                    onChange={(e) => setBusForm({ ...busForm, model: e.target.value })}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label className="label">Capacity (seats)</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="e.g., 30"
                    value={busForm.capacity}
                    onChange={(e) => setBusForm({ ...busForm, capacity: e.target.value })}
                  />
                </div>

                <button onClick={handleCreateBus} className="btn btn-primary btn-block" style={{ marginTop: 16 }}>
                  Add Bus
                </button>
              </>
            )}

            {/* Driver Modal */}
            {showModal === "driver" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 className="modal-title" style={{ margin: 0 }}>Add Driver</h3>
                  <button onClick={() => setShowModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                    <X size={20} />
                  </button>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label className="label">Full Name</label>
                  <input
                    className="input"
                    placeholder="Enter driver's name"
                    value={driverForm.name}
                    onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label className="label">Username</label>
                  <input
                    className="input"
                    placeholder="Login username"
                    value={driverForm.username}
                    onChange={(e) => setDriverForm({ ...driverForm, username: e.target.value })}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label className="label">Password</label>
                  <input
                    className="input"
                    type="password"
                    placeholder="Login password"
                    value={driverForm.password}
                    onChange={(e) => setDriverForm({ ...driverForm, password: e.target.value })}
                  />
                </div>

                <button onClick={handleCreateDriver} className="btn btn-primary btn-block" style={{ marginTop: 16 }}>
                  Add Driver
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
