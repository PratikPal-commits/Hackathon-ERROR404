import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Simple hash function for password
function simpleHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16) + "_hashed";
}

// Generate a simple password for faculty
function generatePassword(email: string): string {
  const prefix = email.split("@")[0];
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}@${randomDigits}`;
}

// Get all faculty and admin users
export const list = query({
  args: {
    role: v.optional(v.union(v.literal("admin"), v.literal("faculty"))),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let users = await ctx.db.query("users").collect();

    // Filter to only admin and faculty
    users = users.filter((u) => u.role === "admin" || u.role === "faculty");

    if (args.role) {
      users = users.filter((u) => u.role === args.role);
    }

    if (args.search) {
      const searchLower = args.search.toLowerCase();
      users = users.filter(
        (u) =>
          u.fullName.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower)
      );
    }

    // Don't return password hash
    return users.map((u) => ({
      _id: u._id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
  },
});

// Get a single faculty by ID
export const getById = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (!user || (user.role !== "admin" && user.role !== "faculty")) {
      return null;
    }
    return {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  },
});

// Create a new faculty member
export const create = mutation({
  args: {
    email: v.string(),
    fullName: v.string(),
    role: v.union(v.literal("admin"), v.literal("faculty")),
  },
  handler: async (ctx, args) => {
    // Check if email already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new Error("A user with this email already exists");
    }

    // Generate password
    const generatedPassword = generatePassword(args.email);
    const passwordHash = simpleHash(generatedPassword);

    const now = Date.now();

    const id = await ctx.db.insert("users", {
      email: args.email,
      fullName: args.fullName,
      passwordHash,
      role: args.role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id,
      generatedPassword,
      message: `${args.role === "admin" ? "Admin" : "Faculty"} created successfully`,
    };
  },
});

// Update faculty details
export const update = mutation({
  args: {
    id: v.id("users"),
    email: v.optional(v.string()),
    fullName: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("faculty"))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const user = await ctx.db.get(id);

    if (!user) {
      throw new Error("User not found");
    }

    if (user.role !== "admin" && user.role !== "faculty") {
      throw new Error("Can only update admin or faculty users");
    }

    // If email is being changed, check it's not taken
    if (updates.email && updates.email !== user.email) {
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", updates.email!))
        .first();

      if (existingUser) {
        throw new Error("A user with this email already exists");
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return { success: true, message: "User updated successfully" };
  },
});

// Toggle active status
export const toggleActive = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);

    if (!user) {
      throw new Error("User not found");
    }

    if (user.role !== "admin" && user.role !== "faculty") {
      throw new Error("Can only modify admin or faculty users");
    }

    await ctx.db.patch(args.id, {
      isActive: !user.isActive,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      isActive: !user.isActive,
      message: `User ${!user.isActive ? "activated" : "deactivated"}`,
    };
  },
});

// Reset password for faculty
export const resetPassword = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);

    if (!user) {
      throw new Error("User not found");
    }

    if (user.role !== "admin" && user.role !== "faculty") {
      throw new Error("Can only reset password for admin or faculty users");
    }

    // Generate new password
    const generatedPassword = generatePassword(user.email);
    const passwordHash = simpleHash(generatedPassword);

    await ctx.db.patch(args.id, {
      passwordHash,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      generatedPassword,
      message: "Password reset successfully",
    };
  },
});

// Delete faculty
export const remove = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);

    if (!user) {
      throw new Error("User not found");
    }

    if (user.role !== "admin" && user.role !== "faculty") {
      throw new Error("Can only delete admin or faculty users");
    }

    // Delete any auth sessions
    const authSessions = await ctx.db
      .query("authSessions")
      .withIndex("by_user", (q) => q.eq("userId", args.id))
      .collect();

    for (const session of authSessions) {
      await ctx.db.delete(session._id);
    }

    // Delete the user
    await ctx.db.delete(args.id);

    return { success: true, message: "User deleted successfully" };
  },
});

// Get stats for admin dashboard
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const students = await ctx.db.query("students").collect();
    const courses = await ctx.db.query("courses").collect();
    const sessions = await ctx.db.query("sessions").collect();

    const admins = users.filter((u) => u.role === "admin");
    const faculty = users.filter((u) => u.role === "faculty");
    const activeAdmins = admins.filter((u) => u.isActive);
    const activeFaculty = faculty.filter((u) => u.isActive);

    const activeSessions = sessions.filter((s) => s.isActive);

    return {
      totalAdmins: admins.length,
      activeAdmins: activeAdmins.length,
      totalFaculty: faculty.length,
      activeFaculty: activeFaculty.length,
      totalStudents: students.length,
      totalCourses: courses.length,
      activeSessions: activeSessions.length,
    };
  },
});
