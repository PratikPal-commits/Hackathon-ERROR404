/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analytics from "../analytics.js";
import type * as anomalies from "../anomalies.js";
import type * as attendance from "../attendance.js";
import type * as auth from "../auth.js";
import type * as courses from "../courses.js";
import type * as networks from "../networks.js";
import type * as seed from "../seed.js";
import type * as sessions from "../sessions.js";
import type * as students from "../students.js";
import type * as timetable from "../timetable.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  anomalies: typeof anomalies;
  attendance: typeof attendance;
  auth: typeof auth;
  courses: typeof courses;
  networks: typeof networks;
  seed: typeof seed;
  sessions: typeof sessions;
  students: typeof students;
  timetable: typeof timetable;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
