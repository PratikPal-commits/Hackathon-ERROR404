import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get all anomalies
export const list = query({
  args: {
    isResolved: v.optional(v.boolean()),
    severity: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical")
      )
    ),
    anomalyType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let anomalies = await ctx.db.query("anomalies").collect();

    if (args.isResolved !== undefined) {
      anomalies = anomalies.filter((a) => a.isResolved === args.isResolved);
    }

    if (args.severity) {
      anomalies = anomalies.filter((a) => a.severity === args.severity);
    }

    if (args.anomalyType) {
      anomalies = anomalies.filter((a) => a.anomalyType === args.anomalyType);
    }

    // Get student and session details
    const anomaliesWithDetails = await Promise.all(
      anomalies.map(async (anomaly) => {
        const student = anomaly.studentId
          ? await ctx.db.get(anomaly.studentId)
          : null;
        const session = anomaly.sessionId
          ? await ctx.db.get(anomaly.sessionId)
          : null;

        let courseName = "Unknown";
        if (session) {
          const course = await ctx.db.get(session.courseId);
          courseName = course?.courseName || "Unknown";
        }

        return {
          ...anomaly,
          studentName: student?.name || "Unknown",
          studentRollNo: student?.rollNo || "Unknown",
          sessionDate: session?.sessionDate || "Unknown",
          courseName,
        };
      })
    );

    // Sort by attempt time (newest first)
    return anomaliesWithDetails.sort((a, b) => b.attemptTime - a.attemptTime);
  },
});

// Get anomaly by ID
export const getById = query({
  args: { id: v.id("anomalies") },
  handler: async (ctx, args) => {
    const anomaly = await ctx.db.get(args.id);
    if (!anomaly) return null;

    const student = anomaly.studentId
      ? await ctx.db.get(anomaly.studentId)
      : null;
    const session = anomaly.sessionId
      ? await ctx.db.get(anomaly.sessionId)
      : null;

    let course = null;
    if (session) {
      course = await ctx.db.get(session.courseId);
    }

    return {
      ...anomaly,
      student,
      session,
      course,
    };
  },
});

// Resolve anomaly
export const resolve = mutation({
  args: {
    id: v.id("anomalies"),
    resolvedBy: v.id("users"),
    resolutionNotes: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isResolved: true,
      resolvedBy: args.resolvedBy,
      resolutionNotes: args.resolutionNotes,
      resolvedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

// Dismiss anomaly
export const dismiss = mutation({
  args: {
    id: v.id("anomalies"),
    resolvedBy: v.id("users"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isResolved: true,
      resolvedBy: args.resolvedBy,
      resolutionNotes: `Dismissed: ${args.reason}`,
      resolvedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

// Create anomaly (internal use)
export const create = mutation({
  args: {
    studentId: v.optional(v.id("students")),
    sessionId: v.optional(v.id("sessions")),
    anomalyType: v.union(
      v.literal("face_mismatch"),
      v.literal("liveness_failed"),
      v.literal("multiple_attempts"),
      v.literal("duplicate_attendance"),
      v.literal("location_mismatch"),
      v.literal("time_anomaly"),
      v.literal("proxy_suspected")
    ),
    severity: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
    reason: v.string(),
    details: v.optional(v.string()),
    capturedImageUrl: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    deviceInfo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const anomalyId = await ctx.db.insert("anomalies", {
      ...args,
      isResolved: false,
      attemptTime: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return anomalyId;
  },
});

// Get recent anomalies (for dashboard)
export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const anomalies = await ctx.db
      .query("anomalies")
      .withIndex("by_resolved", (q) => q.eq("isResolved", false))
      .collect();

    const anomaliesWithDetails = await Promise.all(
      anomalies.slice(0, args.limit || 5).map(async (anomaly) => {
        const student = anomaly.studentId
          ? await ctx.db.get(anomaly.studentId)
          : null;

        return {
          ...anomaly,
          studentName: student?.name || "Unknown",
          studentRollNo: student?.rollNo || "Unknown",
        };
      })
    );

    return anomaliesWithDetails.sort((a, b) => b.attemptTime - a.attemptTime);
  },
});

// Get anomaly stats
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const anomalies = await ctx.db.query("anomalies").collect();

    const total = anomalies.length;
    const resolved = anomalies.filter((a) => a.isResolved).length;
    const pending = total - resolved;

    const bySeverity = {
      critical: anomalies.filter((a) => a.severity === "critical").length,
      high: anomalies.filter((a) => a.severity === "high").length,
      medium: anomalies.filter((a) => a.severity === "medium").length,
      low: anomalies.filter((a) => a.severity === "low").length,
    };

    const byType = {
      face_mismatch: anomalies.filter((a) => a.anomalyType === "face_mismatch")
        .length,
      duplicate_attendance: anomalies.filter(
        (a) => a.anomalyType === "duplicate_attendance"
      ).length,
      liveness_failed: anomalies.filter(
        (a) => a.anomalyType === "liveness_failed"
      ).length,
      proxy_suspected: anomalies.filter(
        (a) => a.anomalyType === "proxy_suspected"
      ).length,
    };

    return {
      total,
      resolved,
      pending,
      bySeverity,
      byType,
    };
  },
});
