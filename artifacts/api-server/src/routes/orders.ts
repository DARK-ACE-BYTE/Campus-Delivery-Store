import { Router, type IRouter } from "express";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db, ordersTable, productsTable } from "@workspace/db";
import {
  CreateOrderBody,
  UpdateOrderStatusBody,
  UpdateOrderStatusParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

function serializeOrder(order: typeof ordersTable.$inferSelect) {
  return {
    ...order,
    total: order.total === null ? null : Number(order.total),
    createdAt: order.createdAt.toISOString(),
  };
}

router.get("/orders", requireAuth, async (_req, res) => {
  const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt), asc(ordersTable.id));
  res.json(orders.map(serializeOrder));
});

router.post("/orders", async (req, res) => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid order details" });
  const [order] = await db.insert(ordersTable).values({
    studentName: parsed.data.studentName,
    phone: parsed.data.phone,
    hostel: parsed.data.hostel,
    items: parsed.data.items,
    total: "0.00",
    status: "pending",
  }).returning();
  return res.status(201).json(serializeOrder(order));
});

router.patch("/orders/:id/status", requireAuth, async (req, res) => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  const body = UpdateOrderStatusBody.safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "Invalid order status" });
  const [order] = await db.update(ordersTable).set({ status: body.data.status }).where(eq(ordersTable.id, params.data.id)).returning();
  if (!order) return res.status(404).json({ error: "Order not found" });
  return res.json(serializeOrder(order));
});

router.get("/dashboard/summary", requireAuth, async (_req, res) => {
  const [summaryRows, productRows] = await Promise.all([
    db.select({
      totalOrders: sql<number>`count(*)::int`,
      pendingOrders: sql<number>`count(*) filter (where ${ordersTable.status} = 'pending')::int`,
      deliveredOrders: sql<number>`count(*) filter (where ${ordersTable.status} = 'delivered')::int`,
      totalRevenue: sql<number>`coalesce(sum(${ordersTable.total}), 0)::float`,
    }).from(ordersTable),
    db.select({ totalProducts: sql<number>`count(*)::int` }).from(productsTable),
  ]);
  const { totalOrders, pendingOrders, deliveredOrders, totalRevenue } = summaryRows[0];
  const { totalProducts } = productRows[0];
  res.json({ totalOrders, pendingOrders, deliveredOrders, totalRevenue, totalProducts });
});

export default router;