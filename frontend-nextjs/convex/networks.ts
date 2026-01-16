import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all allowed networks
export const list = query({
  args: {
    networkType: v.optional(v.union(v.literal("campus"), v.literal("temporary"))),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let networks = await ctx.db.query("allowedNetworks").collect();

    if (args.networkType) {
      networks = networks.filter((n) => n.networkType === args.networkType);
    }

    if (args.activeOnly) {
      const now = Date.now();
      networks = networks.filter((n) => {
        // Check if active and not expired
        if (!n.isActive) return false;
        if (n.expiresAt && n.expiresAt < now) return false;
        return true;
      });
    }

    // Get user info for each network
    const networksWithUsers = await Promise.all(
      networks.map(async (network) => {
        const addedByUser = await ctx.db.get(network.addedBy);
        return {
          ...network,
          addedByName: addedByUser?.fullName || "Unknown",
          addedByRole: addedByUser?.role || "unknown",
        };
      })
    );

    return networksWithUsers;
  },
});

// Get a single network by ID
export const getById = query({
  args: { id: v.id("allowedNetworks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Add a new allowed network (admin can add campus, teacher can add temporary)
export const create = mutation({
  args: {
    name: v.string(),
    ipRange: v.string(),
    location: v.string(),
    networkType: v.union(v.literal("campus"), v.literal("temporary")),
    addedBy: v.id("users"),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Validate IP range format (basic validation)
    const ipRangePattern = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    if (!ipRangePattern.test(args.ipRange)) {
      throw new Error("Invalid IP range format. Use CIDR notation (e.g., 192.168.1.0/24) or single IP (e.g., 192.168.1.1)");
    }

    // Check if the user exists and has proper role
    const user = await ctx.db.get(args.addedBy);
    if (!user) {
      throw new Error("User not found");
    }

    // Only admin can add campus networks, faculty/admin can add temporary
    if (args.networkType === "campus" && user.role !== "admin") {
      throw new Error("Only administrators can add permanent campus networks");
    }

    if (user.role === "student") {
      throw new Error("Students cannot add networks");
    }

    // Check for duplicate IP range
    const existingNetworks = await ctx.db.query("allowedNetworks").collect();
    const duplicate = existingNetworks.find((n) => n.ipRange === args.ipRange && n.isActive);
    if (duplicate) {
      throw new Error("This IP range is already configured");
    }

    const now = Date.now();

    // For temporary networks, set default expiry if not provided (24 hours)
    let expiresAt = args.expiresAt;
    if (args.networkType === "temporary" && !expiresAt) {
      expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours from now
    }

    const id = await ctx.db.insert("allowedNetworks", {
      name: args.name,
      ipRange: args.ipRange,
      location: args.location,
      networkType: args.networkType,
      isActive: true,
      addedBy: args.addedBy,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    return { id, message: "Network added successfully" };
  },
});

// Update an existing network
export const update = mutation({
  args: {
    id: v.id("allowedNetworks"),
    name: v.optional(v.string()),
    ipRange: v.optional(v.string()),
    location: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const network = await ctx.db.get(id);

    if (!network) {
      throw new Error("Network not found");
    }

    // Validate IP range if being updated
    if (updates.ipRange) {
      const ipRangePattern = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
      if (!ipRangePattern.test(updates.ipRange)) {
        throw new Error("Invalid IP range format");
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Network updated successfully" };
  },
});

// Delete a network
export const remove = mutation({
  args: { id: v.id("allowedNetworks") },
  handler: async (ctx, args) => {
    const network = await ctx.db.get(args.id);

    if (!network) {
      throw new Error("Network not found");
    }

    await ctx.db.delete(args.id);

    return { success: true, message: "Network removed successfully" };
  },
});

// Toggle network active status
export const toggleActive = mutation({
  args: { id: v.id("allowedNetworks") },
  handler: async (ctx, args) => {
    const network = await ctx.db.get(args.id);

    if (!network) {
      throw new Error("Network not found");
    }

    await ctx.db.patch(args.id, {
      isActive: !network.isActive,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      isActive: !network.isActive,
      message: `Network ${!network.isActive ? "activated" : "deactivated"}`,
    };
  },
});

// Extend expiry for temporary network
export const extendExpiry = mutation({
  args: {
    id: v.id("allowedNetworks"),
    hours: v.number(),
  },
  handler: async (ctx, args) => {
    const network = await ctx.db.get(args.id);

    if (!network) {
      throw new Error("Network not found");
    }

    if (network.networkType !== "temporary") {
      throw new Error("Can only extend expiry for temporary networks");
    }

    const now = Date.now();
    const currentExpiry = network.expiresAt || now;
    const newExpiry = Math.max(currentExpiry, now) + args.hours * 60 * 60 * 1000;

    await ctx.db.patch(args.id, {
      expiresAt: newExpiry,
      updatedAt: now,
    });

    return {
      success: true,
      newExpiresAt: newExpiry,
      message: `Expiry extended by ${args.hours} hours`,
    };
  },
});

// Cleanup expired temporary networks
export const cleanupExpired = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const networks = await ctx.db
      .query("allowedNetworks")
      .withIndex("by_type", (q) => q.eq("networkType", "temporary"))
      .collect();

    let removedCount = 0;
    for (const network of networks) {
      if (network.expiresAt && network.expiresAt < now) {
        await ctx.db.delete(network._id);
        removedCount++;
      }
    }

    return {
      success: true,
      removedCount,
      message: `Removed ${removedCount} expired networks`,
    };
  },
});

// Verify if an IP is allowed
export const verifyIp = query({
  args: { ipAddress: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const networks = await ctx.db
      .query("allowedNetworks")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Filter out expired networks
    const activeNetworks = networks.filter((n) => {
      if (n.expiresAt && n.expiresAt < now) return false;
      return true;
    });

    for (const network of activeNetworks) {
      if (isIpInRange(args.ipAddress, network.ipRange)) {
        return {
          allowed: true,
          networkId: network._id,
          networkName: network.name,
          location: network.location,
          networkType: network.networkType,
        };
      }
    }

    return {
      allowed: false,
      networkId: null,
      networkName: null,
      location: null,
      networkType: null,
    };
  },
});

// Helper function to check if IP is in CIDR range
function isIpInRange(ip: string, cidr: string): boolean {
  // Handle single IP (no CIDR notation)
  if (!cidr.includes("/")) {
    return ip === cidr;
  }

  const [range, bits] = cidr.split("/");
  const mask = ~(2 ** (32 - parseInt(bits)) - 1);

  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(range);

  return (ipNum & mask) === (rangeNum & mask);
}

function ipToNumber(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
}
