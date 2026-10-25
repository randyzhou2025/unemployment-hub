import {
  pgTable,
  text,
  jsonb,
  integer,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import type { Draft, Content, Source } from "@uh/contracts";
export const contents = pgTable("contents", {
  id: text("id").primaryKey(),
  draft: jsonb("draft").$type<Draft>().notNull(),
  draftVersion: integer("draft_version").notNull().default(1),
  state: text("state").notNull().default("draft"),
  currentRevision: integer("current_revision").notNull().default(0),
  withdrawn: integer("withdrawn").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const revisions = pgTable(
  "content_revisions",
  {
    contentId: text("content_id")
      .notNull()
      .references(() => contents.id),
    revision: integer("revision").notNull(),
    snapshot: jsonb("snapshot").$type<Content>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.contentId, t.revision] })],
);
export const sources = pgTable("sources", {
  id: text("id").primaryKey(),
  data: jsonb("data").$type<Source>().notNull(),
});
export const admins = pgTable("admin_users", {
  username: text("username").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
});
export const sessions = pgTable("admin_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  username: text("username")
    .notNull()
    .references(() => admins.username),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
export const audit = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  entityId: text("entity_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const feedbacks = pgTable("feedbacks", {
  id: text("id").primaryKey(),
  contentId: text("content_id"),
  message: text("message").notNull(),
  state: text("state").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const config = pgTable("app_config", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});
export const miniUsers = pgTable("mini_users", {
  id: text("id").primaryKey(),
  appId: text("app_id").notNull(),
  openid: text("openid").notNull(),
  nickname: text("nickname").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const miniSessions = pgTable("mini_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => miniUsers.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const miniDailyActivity = pgTable(
  "mini_daily_activity",
  {
    userId: text("user_id")
      .notNull()
      .references(() => miniUsers.id),
    day: text("day").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    visits: integer("visits").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
);
