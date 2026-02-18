import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("buses").collect();
  },
});

export const get = query({
  args: { id: v.id("buses") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    plate: v.string(),
    model: v.optional(v.string()),
    capacity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check for duplicate plate
    const existing = await ctx.db
      .query("buses")
      .withIndex("by_plate", (q) => q.eq("plate", args.plate))
      .unique();

    if (existing) {
      throw new Error("Bus with this plate already exists");
    }

    return await ctx.db.insert("buses", {
      plate: args.plate,
      model: args.model,
      capacity: args.capacity,
      status: "idle",
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("buses"),
    plate: v.optional(v.string()),
    model: v.optional(v.string()),
    capacity: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("maintenance"),
        v.literal("idle")
      )
    ),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const update: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        update[key] = value;
      }
    }
    await ctx.db.patch(id, update);
  },
});

export const remove = mutation({
  args: { id: v.id("buses") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
