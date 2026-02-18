import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("routes").collect();
  },
});

export const get = query({
  args: { id: v.id("routes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("routes", {
      name: args.name,
      description: args.description,
      stops: args.stops,
      color: args.color || "#3B82F6",
      isActive: true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("routes"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    stops: v.optional(
      v.array(
        v.object({
          name: v.string(),
          lat: v.number(),
          lng: v.number(),
          order: v.number(),
        })
      )
    ),
    color: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
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
  args: { id: v.id("routes") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
