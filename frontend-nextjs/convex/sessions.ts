import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Generate a 6-character attendance code
function generateAttendanceCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create a new session
export const create = mutation({
  args: {
    courseId: v.id("courses"),
    sessionDate: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    roomNo: v.optional(v.string()),
    building: v.optional(v.string()),
    timetableId: v.optional(v.id("timetable")),
  },
  handler: async (ctx, args) => {
    // Validate that session date is not in the past
    const today = new Date().toISOString().split("T")[0];
    if (args.sessionDate < today) {
      throw new Error("Cannot create sessions for past dates");
    }

    const now = Date.now();
    const sessionId = await ctx.db.insert("sessions", {
      courseId: args.courseId,
      sessionDate: args.sessionDate,
      startTime: args.startTime,
      endTime: args.endTime,
      roomNo: args.roomNo,
      building: args.building,
      isActive: false,
      timetableId: args.timetableId,
      createdManually: !args.timetableId,
      createdAt: now,
      updatedAt: now,
    });

    return sessionId;
  },
});

// Get all sessions
export const list = query({
  args: {
    courseId: v.optional(v.id("courses")),
    date: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let sessions = await ctx.db.query("sessions").collect();

    if (args.courseId) {
      sessions = sessions.filter((s) => s.courseId === args.courseId);
    }

    if (args.date) {
      sessions = sessions.filter((s) => s.sessionDate === args.date);
    }

    if (args.isActive !== undefined) {
      sessions = sessions.filter((s) => s.isActive === args.isActive);
    }

    // Get course details
    const sessionsWithCourse = await Promise.all(
      sessions.map(async (session) => {
        const course = await ctx.db.get(session.courseId);
        return {
          ...session,
          courseName: course?.courseName || "Unknown",
          courseCode: course?.courseCode || "Unknown",
        };
      })
    );

    // Sort by date and time (newest first)
    return sessionsWithCourse.sort((a, b) => {
      const dateCompare = b.sessionDate.localeCompare(a.sessionDate);
      if (dateCompare !== 0) return dateCompare;
      return b.startTime.localeCompare(a.startTime);
    });
  },
});

// Get session by ID
export const getById = query({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.id);
    if (!session) return null;

    const course = await ctx.db.get(session.courseId);
    return {
      ...session,
      courseName: course?.courseName || "Unknown",
      courseCode: course?.courseCode || "Unknown",
    };
  },
});

// Get session by attendance code
export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_code", (q) => q.eq("attendanceCode", args.code))
      .first();

    if (!session) return null;

    const course = await ctx.db.get(session.courseId);
    return {
      ...session,
      courseName: course?.courseName || "Unknown",
      courseCode: course?.courseCode || "Unknown",
    };
  },
});

// Activate session (start attendance)
export const activate = mutation({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.id);
    if (!session) {
      throw new Error("Session not found");
    }

    const attendanceCode = generateAttendanceCode();

    await ctx.db.patch(args.id, {
      isActive: true,
      attendanceCode,
      updatedAt: Date.now(),
    });

    return { attendanceCode };
  },
});

// Deactivate session (stop attendance)
export const deactivate = mutation({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.id);
    if (!session) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(args.id, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Update session
export const update = mutation({
  args: {
    id: v.id("sessions"),
    sessionDate: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    roomNo: v.optional(v.string()),
    building: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

// Delete session
export const remove = mutation({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Get active sessions
export const getActiveSessions = query({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const sessionsWithCourse = await Promise.all(
      sessions.map(async (session) => {
        const course = await ctx.db.get(session.courseId);
        return {
          ...session,
          courseName: course?.courseName || "Unknown",
          courseCode: course?.courseCode || "Unknown",
        };
      })
    );

    return sessionsWithCourse;
  },
});

// Get today's sessions
export const getTodaySessions = query({
  args: { facultyId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0];
    let sessions = await ctx.db
      .query("sessions")
      .withIndex("by_date", (q) => q.eq("sessionDate", today))
      .collect();

    const sessionsWithCourse = await Promise.all(
      sessions.map(async (session) => {
        const course = await ctx.db.get(session.courseId);
        if (!course) return null;
        if (args.facultyId && course.facultyId !== args.facultyId) return null;
        
        return {
          ...session,
          courseName: course.courseName,
          courseCode: course.courseCode,
          facultyId: course.facultyId,
        };
      })
    );

    return sessionsWithCourse.filter((s) => s !== null);
  },
});

// Get upcoming sessions
export const getUpcomingSessions = query({
  args: { facultyId: v.optional(v.id("users")), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0];
    const sessions = await ctx.db.query("sessions").collect();

    const upcomingSessions = sessions.filter((s) => s.sessionDate >= today);

    const sessionsWithCourse = await Promise.all(
      upcomingSessions.map(async (session) => {
        const course = await ctx.db.get(session.courseId);
        if (!course) return null;
        if (args.facultyId && course.facultyId !== args.facultyId) return null;

        return {
          ...session,
          courseName: course.courseName,
          courseCode: course.courseCode,
        };
      })
    );

    const filtered = sessionsWithCourse.filter((s) => s !== null);
    filtered.sort((a, b) => {
      const dateCompare = a!.sessionDate.localeCompare(b!.sessionDate);
      if (dateCompare !== 0) return dateCompare;
      return a!.startTime.localeCompare(b!.startTime);
    });

    return args.limit ? filtered.slice(0, args.limit) : filtered;
  },
});
