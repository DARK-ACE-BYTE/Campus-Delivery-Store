import { db, productsTable } from "@workspace/db";

/**
 * Extra everyday products that should always be available in the storefront.
 * Existing products are matched by name so deployments can safely run this
 * more than once without creating duplicates.
 */
const expandedCatalog = [
  { name: "Coca-Cola", category: "Drinks", description: "Chilled Coca-Cola for meals, hangouts, and study breaks.", emoji: "🥤", available: true },
  { name: "Malt Drink", category: "Drinks", description: "Cold non-alcoholic malt drink, ready to refresh your day.", emoji: "🍺", available: true },
  { name: "Power Bank", category: "Electronics", description: "Portable backup power to keep your phone running through lectures.", emoji: "🔋", available: true },
  { name: "Wireless Earbuds", category: "Electronics", description: "Compact Bluetooth earbuds for music, calls, and online classes.", emoji: "🎧", available: true },
  { name: "Exercise Book", category: "Home", description: "A ruled notebook for lecture notes, assignments, and revision.", emoji: "📓", available: true },
  { name: "Ballpoint Pen Pack", category: "Home", description: "A handy pack of smooth-writing blue and black pens.", emoji: "🖊️", available: true },
  { name: "Rice 5kg", category: "Groceries", description: "Quality long-grain rice for easy hostel meals and weekly cooking.", emoji: "🍚", available: true },
  { name: "Eggs Pack", category: "Groceries", description: "Fresh eggs for breakfast, noodles, and quick student meals.", emoji: "🥚", available: true },
  { name: "Sardines", category: "Groceries", description: "Tinned sardines for bread, rice, noodles, and simple meals.", emoji: "🐟", available: true },
  { name: "Jollof Rice Bowl", category: "Meals", description: "Tasty Ghana-style jollof rice served with chicken and salad.", emoji: "🍗", available: true },
  { name: "Fried Rice Bowl", category: "Meals", description: "Fresh fried rice with chicken, vegetables, and pepper sauce.", emoji: "🍛", available: true },
  { name: "Body Lotion", category: "Personal Care", description: "Everyday moisturising lotion to keep your skin soft and fresh.", emoji: "🧴", available: true },
  { name: "Deodorant", category: "Personal Care", description: "Long-lasting freshness for lectures, sports, and busy campus days.", emoji: "✨", available: true },
  { name: "Chocolate Biscuits", category: "Snacks", description: "Crunchy chocolate biscuits for a quick snack between lectures.", emoji: "🍪", available: true },
  { name: "Groundnuts", category: "Snacks", description: "Roasted Ghanaian groundnuts, lightly salted and ready to snack on.", emoji: "🥜", available: true },
  { name: "Shower Slippers", category: "Fashion", description: "Lightweight, water-friendly slippers made for hostel bathrooms.", emoji: "🩴", available: true },
] as const;

let catalogExpansion: Promise<void> | undefined;

export function ensureExpandedCatalog() {
  if (!catalogExpansion) {
    catalogExpansion = (async () => {
      const existing = await db.select({ name: productsTable.name }).from(productsTable);
      const names = new Set(existing.map((product) => product.name.toLowerCase()));
      const missing = expandedCatalog.filter((product) => !names.has(product.name.toLowerCase()));
      if (missing.length) await db.insert(productsTable).values(missing.map((product) => ({ ...product })));
    })().catch((error) => {
      catalogExpansion = undefined;
      throw error;
    });
  }
  return catalogExpansion;
}
