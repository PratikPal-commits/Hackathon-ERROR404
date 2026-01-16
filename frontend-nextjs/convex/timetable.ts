import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create timetable entry
export const create = mutation({
  args: {
    courseId: v.id("courses"),
    dayOfWeek: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    roomNo: v.optional(v.string()),
    building: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const timetableId = await ctx.db.insert("timetable", {
      courseId: args.courseId,
      dayOfWeek: args.dayOfWeek,
      startTime: args.startTime,
      endTime: args.endTime,
      roomNo: args.roomNo,
      building: args.building,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return timetableId;
  },
});

// Get all timetable entries
export const list = query({
  args: {
    courseId: v.optional(v.id("courses")),
    dayOfWeek: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let entries = await ctx.db.query("timetable").collect();

    if (args.courseId) {
      entries = entries.filter((e) => e.courseId === args.courseId);
    }

    if (args.dayOfWeek !== undefined) {
      entries = entries.filter((e) => e.dayOfWeek === args.dayOfWeek);
    }

    // Get course details
    const entriesWithCourse = await Promise.all(
      entries.map(async (entry) => {
        const course = await ctx.db.get(entry.courseId);
        return {
          ...entry,
          courseName: course?.courseName || "Unknown",
          courseCode: course?.courseCode || "Unknown",
        };
      })
    );

    return entriesWithCourse.sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.startTime.localeCompare(b.startTime);
    });
  },
});

// Get timetable entry by ID
export const getById = query({
  args: { id: v.id("timetable") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Update timetable entry
export const update = mutation({
  args: {
    id: v.id("timetable"),
    dayOfWeek: v.optional(v.number()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    roomNo: v.optional(v.string()),
    building: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
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

// Delete timetable entry
export const remove = mutation({
  args: { id: v.id("timetable") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Generate sessions from timetable for a date range
export const generateSessions = mutation({
  args: {
    startDate: v.string(), // "2024-01-15"
    endDate: v.string(), // "2024-01-21"
    courseId: v.optional(v.id("courses")),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("timetable")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const filteredEntries = args.courseId
      ? entries.filter((e) => e.courseId === args.courseId)
      : entries;

    const start = new Date(args.startDate);
    const end = new Date(args.endDate);
    const sessionsCreated: Id<"sessions">[] = [];

    // Iterate through each day in the range
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      const dateStr = d.toISOString().split("T")[0];

      // Find timetable entries for this day
      const dayEntries = filteredEntries.filter((e) => e.dayOfWeek === dayOfWeek);

      for (const entry of dayEntries) {
        // Check if session already exists for this date and timetable entry
        const existing = await ctx.db
          .query("sessions")
          .filter((q) =>
            q.and(
              q.eq(q.field("courseId"), entry.courseId),
              q.eq(q.field("sessionDate"), dateStr),
              q.eq(q.field("startTime"), entry.startTime)
            )
          )
          .first();

        if (!existing) {
          const sessionId = await ctx.db.insert("sessions", {
            courseId: entry.courseId,
            sessionDate: dateStr,
            startTime: entry.startTime,
            endTime: entry.endTime,
            roomNo: entry.roomNo,
            building: entry.building,
            isActive: false,
            timetableId: entry._id,
            createdManually: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          sessionsCreated.push(sessionId);
        }
      }
    }

    return {
      success: true,
      sessionsCreated: sessionsCreated.length,
    };
  },
});

// Get today's timetable
export const getTodaySchedule = query({
  args: { facultyId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const today = new Date().getDay();
    let entries = await ctx.db
      .query("timetable")
      .withIndex("by_day", (q) => q.eq("dayOfWeek", today))
      .collect();

    entries = entries.filter((e) => e.isActive);

    const entriesWithCourse = await Promise.all(
      entries.map(async (entry) => {
        const course = await ctx.db.get(entry.courseId);
        if (!course) return null;
        if (args.facultyId && course.facultyId !== args.facultyId) return null;

        return {
          ...entry,
          courseName: course.courseName,
          courseCode: course.courseCode,
        };
      })
    );

    return entriesWithCourse
      .filter((e) => e !== null)
      .sort((a, b) => a!.startTime.localeCompare(b!.startTime));
  },
});

// Get weekly timetable for a course
export const getWeeklySchedule = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("timetable")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    const course = await ctx.db.get(args.courseId);

    return entries
      .filter((e) => e.isActive)
      .map((e) => ({
        ...e,
        courseName: course?.courseName || "Unknown",
        courseCode: course?.courseCode || "Unknown",
      }))
      .sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
        return a.startTime.localeCompare(b.startTime);
      });
  },
});

// Day of week helper
export const getDayName = (dayOfWeek: number): string => {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[dayOfWeek] || "Unknown";
};
