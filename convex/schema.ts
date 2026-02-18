import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    password: v.string(),
    role: v.union(v.literal("admin"), v.literal("driver")),
    name: v.string(),
  }).index("by_username", ["username"]),

  routes: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    stops: v.array(
      v.object({
        name: v.string(),
        lat: v.number(),
        lng: v.number(),
        order: v.number(),
      })
    ),
    color: v.optional(v.string()),
    isActive: v.boolean(),
  }),

  buses: defineTable({
    plate: v.string(),
    model: v.optional(v.string()),
    capacity: v.optional(v.number()),
    status: v.union(
      v.literal("active"),
      v.literal("maintenance"),
      v.literal("idle")
    ),
  }).index("by_plate", ["plate"]),

  trips: defineTable({
    busId: v.id("buses"),
    driverId: v.id("users"),
    routeId: v.id("routes"),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("completed")),
    // Cached latest location for quick queries
    lastLat: v.optional(v.number()),
    lastLng: v.optional(v.number()),
    lastSpeed: v.optional(v.number()),
    lastHeading: v.optional(v.number()),
    lastLocationTime: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_driver", ["driverId"])
    .index("by_bus", ["busId"]),

  locations: defineTable({
    tripId: v.id("trips"),
    busId: v.id("buses"),
    lat: v.number(),
    lng: v.number(),
    speed: v.optional(v.number()),
    heading: v.optional(v.number()),
    timestamp: v.number(),
  })
    .index("by_trip", ["tripId"])
    .index("by_bus_time", ["busId", "timestamp"]),
});
