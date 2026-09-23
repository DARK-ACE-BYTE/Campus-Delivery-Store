import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import {
  CreateProductBody,
  UpdateProductBody,
  UpdateProductParams,
  DeleteProductParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { ensureExpandedCatalog } from "../catalog";

const router: IRouter = Router();

function serializeProduct(product: typeof productsTable.$inferSelect) {
  return {
    ...product,
    price: product.price === null ? null : Number(product.price),
    createdAt: product.createdAt.toISOString(),
  };
}

router.get("/products", async (_req, res) => {
  await ensureExpandedCatalog();
  const products = await db.select().from(productsTable).orderBy(asc(productsTable.category), asc(productsTable.name));
  res.json(products.map(serializeProduct));
});

router.post("/products", requireAuth, async (req, res) => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid product details" });
  const [product] = await db.insert(productsTable).values({
    ...parsed.data,
    price: parsed.data.price == null ? null : parsed.data.price.toFixed(2),
  }).returning();
  return res.status(201).json(serializeProduct(product));
});

router.patch("/products/:id", requireAuth, async (req, res) => {
  const params = UpdateProductParams.safeParse(req.params);
  const body = UpdateProductBody.safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "Invalid product details" });
  const values: {
    name?: string;
    category?: string;
    price?: string | null;
    description?: string;
    emoji?: string;
    available?: boolean;
  } = {
    name: body.data.name,
    category: body.data.category,
    price: body.data.price === undefined ? undefined : body.data.price === null ? null : body.data.price.toFixed(2),
    description: body.data.description,
    emoji: body.data.emoji,
    available: body.data.available,
  };
  const [product] = await db.update(productsTable).set(values).where(eq(productsTable.id, params.data.id)).returning();
  if (!product) return res.status(404).json({ error: "Product not found" });
  return res.json(serializeProduct(product));
});

router.delete("/products/:id", requireAuth, async (req, res) => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid product id" });
  const deleted = await db.delete(productsTable).where(eq(productsTable.id, params.data.id)).returning({ id: productsTable.id });
  if (!deleted.length) return res.status(404).json({ error: "Product not found" });
  return res.status(204).send();
});

export default router;