import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const startTrip = mutation({
  args: {
    busId: v.id("buses"),
    driverId: v.id("users"),
    routeId: v.id("routes"),
  },
  handler: async (ctx, args) => {
    // Check if bus already has an active trip
    const existingBusTrip = await ctx.db
      .query("trips")
      .withIndex("by_bus", (q) => q.eq("busId", args.busId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (existingBusTrip) {
      throw new Error("This bus already has an active trip");
    }

    // Check if driver already has an active trip
    const existingDriverTrip = await ctx.db
      .query("trips")
      .withIndex("by_driver", (q) => q.eq("driverId", args.driverId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (existingDriverTrip) {
      throw new Error("You already have an active trip");
    }

    // Mark bus as active
    await ctx.db.patch(args.busId, { status: "active" });

    return await ctx.db.insert("trips", {
      busId: args.busId,
      driverId: args.driverId,
      routeId: args.routeId,
      startTime: Date.now(),
      status: "active",
    });
  },
});

export const endTrip = mutation({
  args: {
    tripId: v.id("trips"),
  },
  handler: async (ctx, args) => {
    const trip = await ctx.db.get(args.tripId);
    if (!trip) throw new Error("Trip not found");
    if (trip.status !== "active") throw new Error("Trip is not active");

    // Mark bus as idle
    await ctx.db.patch(trip.busId, { status: "idle" });

    await ctx.db.patch(args.tripId, {
      status: "completed",
      endTime: Date.now(),
    });
  },
});

export const updateLocation = mutation({
  args: {
    tripId: v.id("trips"),
    lat: v.number(),
    lng: v.number(),
    speed: v.optional(v.number()),
    heading: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const trip = await ctx.db.get(args.tripId);
    if (!trip || trip.status !== "active") return;

    const timestamp = Date.now();

    // Insert location record
    await ctx.db.insert("locations", {
      tripId: args.tripId,
      busId: trip.busId,
      lat: args.lat,
      lng: args.lng,
      speed: args.speed,
      heading: args.heading,
      timestamp,
    });

    // Update cached location on trip for fast queries
    await ctx.db.patch(args.tripId, {
      lastLat: args.lat,
      lastLng: args.lng,
      lastSpeed: args.speed,
      lastHeading: args.heading,
      lastLocationTime: timestamp,
    });
  },
});

export const getActiveTrips = query({
  handler: async (ctx) => {
    const trips = await ctx.db
      .query("trips")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Enrich with bus, driver, route info
    const enrichedTrips = await Promise.all(
      trips.map(async (trip) => {
        const bus = await ctx.db.get(trip.busId);
        const driver = await ctx.db.get(trip.driverId);
        const route = await ctx.db.get(trip.routeId);
        return {
          ...trip,
          bus: bus ? { plate: bus.plate, model: bus.model } : null,
          driver: driver ? { name: driver.name } : null,
          route: route
            ? { name: route.name, stops: route.stops, color: route.color }
            : null,
        };
      })
    );

    return enrichedTrips;
  },
});

export const getActiveTripForDriver = query({
  args: { driverId: v.id("users") },
  handler: async (ctx, args) => {
    const trip = await ctx.db
      .query("trips")
      .withIndex("by_driver", (q) => q.eq("driverId", args.driverId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!trip) return null;

    const bus = await ctx.db.get(trip.busId);
    const route = await ctx.db.get(trip.routeId);

    return {
      ...trip,
      bus: bus ? { plate: bus.plate, model: bus.model } : null,
      route: route ? { name: route.name, stops: route.stops } : null,
    };
  },
});

export const getActiveTripsForRoute = query({
  args: { routeId: v.id("routes") },
  handler: async (ctx, args) => {
    const trips = await ctx.db
      .query("trips")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const routeTrips = trips.filter(
      (t) => t.routeId === args.routeId
    );

    const enriched = await Promise.all(
      routeTrips.map(async (trip) => {
        const bus = await ctx.db.get(trip.busId);
        return {
          ...trip,
          bus: bus ? { plate: bus.plate, model: bus.model } : null,
        };
      })
    );

    return enriched;
  },
});
