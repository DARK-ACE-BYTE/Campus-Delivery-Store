import { jsonb, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const orderItemSchema = z.object({
  productId: z.number().int().positive(),
  name: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
});

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  studentName: text("student_name").notNull(),
  phone: text("phone").notNull(),
  hostel: text("hostel").notNull(),
  items: jsonb("items").$type<z.infer<typeof orderItemSchema>[]>().notNull(),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;