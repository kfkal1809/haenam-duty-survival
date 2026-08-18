import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const leaderboard = sqliteTable("leaderboard", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientHash: text("client_hash").notNull(),
  nickname: text("nickname").notNull(),
  score: integer("score").notNull().default(0),
  successes: integer("successes").notNull().default(0),
  title: text("title").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("leaderboard_client_hash_unique").on(table.clientHash),
  index("leaderboard_score_idx").on(table.score, table.successes, table.updatedAt),
]);
