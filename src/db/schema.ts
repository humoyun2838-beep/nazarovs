import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("client"),
  fullName: text("full_name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  status: text("status").notNull().default("active"),
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default("book-open"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const materials = sqliteTable("materials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  summary: text("summary").notNull().default(""),
  content: text("content").notNull().default(""),
  sourceUrl: text("source_url").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  icon: text("icon").notNull().default("file-text"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const chatSessions = sqliteTable("chat_sessions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull().default(""),
  language: text("language").notNull().default("uz"),
  page: text("page").notNull().default(""),
  visitorIp: text("visitor_ip").notNull().default(""),
  createdAt: text("created_at").notNull(),
  lastReadAt: text("last_read_at").notNull().default(""),
  lastVisitorSeenAt: text("last_visitor_seen_at").notNull().default(""),
  status: text("status").notNull().default("open"),
  closedAt: text("closed_at").notNull().default(""),
  lastOperatorAt: text("last_operator_at").notNull().default(""),
  rating: text("rating").notNull().default(""),
  ratedAt: text("rated_at").notNull().default(""),
  threadId: text("thread_id").notNull().default(""),
  clientUserId: integer("client_user_id").notNull().default(0),
  inquiryCategoryId: integer("inquiry_category_id").notNull().default(0),
  inquiryCategoryTitle: text("inquiry_category_title").notNull().default(""),
  closedByUserId: integer("closed_by_user_id").notNull().default(0),
});

export const clientVisits = sqliteTable("client_visits", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull(),
  username: text("username").notNull(),
  fullName: text("full_name").notNull().default(""),
  ip: text("ip").notNull().default(""),
  userAgent: text("user_agent").notNull().default(""),
  device: text("device").notNull().default(""),
  browser: text("browser").notNull().default(""),
  os: text("os").notNull().default(""),
  page: text("page").notNull().default(""),
  startedAt: text("started_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
  endedAt: text("ended_at").notNull().default(""),
  country: text("country").notNull().default(""),
  region: text("region").notNull().default(""),
  city: text("city").notNull().default(""),
  lat: text("lat").notNull().default(""),
  lon: text("lon").notNull().default(""),
  address: text("address").notNull().default(""),
});

export const clientRequests = sqliteTable("client_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  workplace: text("workplace").notNull().default(""),
  status: text("status").notNull().default("pending"),
  userId: integer("user_id").notNull().default(0),
  username: text("username").notNull().default(""),
  createdAt: text("created_at").notNull(),
  decidedAt: text("decided_at").notNull().default(""),
  issuedPassword: text("issued_password").notNull().default(""),
  expiresAt: text("expires_at").notNull().default(""),
});

export const chatMessages = sqliteTable("chat_messages", {
  actorUserId: integer("actor_user_id").notNull().default(0),
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id")
    .notNull()
    .references(() => chatSessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  body: text("body").notNull(),
  telegramOk: integer("telegram_ok").notNull().default(0),
  telegramError: text("telegram_error").notNull().default(""),
  telegramPayload: text("telegram_payload").notNull().default(""),
  telegramMid: integer("telegram_mid").notNull().default(0),
  kind: text("kind").notNull().default("text"),
  mediaKey: text("media_key").notNull().default(""),
  mime: text("mime").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const chatTemplates = sqliteTable("chat_templates", {
  id: text("id").primaryKey(),
  lang: text("lang").notNull().default("uz"),
  label: text("label").notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull(),
});

export type UserRole = "client" | "admin" | "operator";
export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Material = typeof materials.$inferSelect;
export type ChatSession = typeof chatSessions.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type ClientRequest = typeof clientRequests.$inferSelect;
export type ClientVisit = typeof clientVisits.$inferSelect;
