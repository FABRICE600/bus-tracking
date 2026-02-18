import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Simple login — MVP, no hashing (would add bcrypt for production)
export const login = mutation({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    if (user.password !== args.password) {
      throw new Error("Invalid password");
    }

    return {
      id: user._id,
      username: user.username,
      name: user.name,
      role: user.role,
    };
  },
});

export const createUser = mutation({
  args: {
    username: v.string(),
    password: v.string(),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("driver")),
  },
  handler: async (ctx, args) => {
    // Check if username already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();

    if (existing) {
      throw new Error("Username already exists");
    }

    return await ctx.db.insert("users", {
      username: args.username,
      password: args.password,
      name: args.name,
      role: args.role,
    });
  },
});

export const listDrivers = query({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => u.role === "driver")
      .map((u) => ({ id: u._id, name: u.name, username: u.username }));
  },
});

export const listUsers = query({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      id: u._id,
      name: u.name,
      username: u.username,
      role: u.role,
    }));
  },
});
