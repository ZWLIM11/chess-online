import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  fen: text("fen").notNull(),
  hostToken: text("host_token").notNull(),
  guestToken: text("guest_token"),
  moves: text("moves").notNull().default("[]"),
  revision: integer("revision").notNull().default(0),
  updatedAt: integer("updated_at").notNull(),
});
