import { mutation } from "./_generated/server";

// Seed data for testing — creates a sample route, bus, admin, and driver
export const seedData = mutation({
  handler: async (ctx) => {
    // Check if already seeded
    const existingUsers = await ctx.db.query("users").collect();
    if (existingUsers.length > 0) {
      return "Already seeded";
    }

    // Create admin user
    await ctx.db.insert("users", {
      username: "admin",
      password: "admin123",
      name: "System Admin",
      role: "admin",
    });

    // Create driver
    const driverId = await ctx.db.insert("users", {
      username: "driver1",
      password: "driver123",
      name: "Jean Baptiste",
      role: "driver",
    });

    // Create a sample Kigali route
    const routeId = await ctx.db.insert("routes", {
      name: "Kigali City Center - Kimironko",
      description: "Main route from city center to Kimironko market",
      stops: [
        { name: "KBC (City Center)", lat: -1.9441, lng: 30.0619, order: 1 },
        { name: "Kigali Heights", lat: -1.9500, lng: 30.0650, order: 2 },
        { name: "Remera", lat: -1.9560, lng: 30.0890, order: 3 },
        { name: "Kimironko Market", lat: -1.9475, lng: 30.1050, order: 4 },
      ],
      color: "#10B981",
      isActive: true,
    });

    // Create a second route
    await ctx.db.insert("routes", {
      name: "Nyabugogo - Kacyiru",
      description: "Route from Nyabugogo bus station to Kacyiru",
      stops: [
        { name: "Nyabugogo Station", lat: -1.9380, lng: 30.0450, order: 1 },
        { name: "Muhima", lat: -1.9420, lng: 30.0550, order: 2 },
        { name: "Kacyiru", lat: -1.9350, lng: 30.0700, order: 3 },
      ],
      color: "#3B82F6",
      isActive: true,
    });

    // Create a bus
    await ctx.db.insert("buses", {
      plate: "RAD 001A",
      model: "Toyota Coaster",
      capacity: 30,
      status: "idle",
    });

    await ctx.db.insert("buses", {
      plate: "RAD 002B",
      model: "Yutong ZK6729D",
      capacity: 25,
      status: "idle",
    });

    return { driverId, routeId, message: "Seed data created successfully" };
  },
});
