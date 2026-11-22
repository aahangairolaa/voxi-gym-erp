/**
 * Sample café shown in the locked preview, so gyms can see what VOXI Café does before they buy it.
 * Nothing here is saved; the real menu starts empty once the add-on is unlocked.
 */
export type CafeCategory = "COFFEE" | "SHAKE" | "JUICE" | "SNACK" | "MEAL" | "DRINK";

export const CAFE_CATEGORY_LABEL: Record<CafeCategory, string> = {
  COFFEE: "Coffee",
  SHAKE: "Protein shakes",
  JUICE: "Juices and smoothies",
  SNACK: "Snacks",
  MEAL: "Meals",
  DRINK: "Drinks",
};

export type CafeItemView = {
  id: string;
  name: string;
  category: CafeCategory;
  price: number;
  calories: number | null;
  protein: number | null;
  stock: number | null;
  active: boolean;
};

export type CafeSaleView = {
  id: string;
  total: number;
  method: "CASH" | "CARD" | "TRANSFER";
  items: { itemId: string; name: string; price: number; qty: number }[];
  createdAt: string;
  member: { id: string; firstName: string; lastName: string } | null;
  soldBy: { name: string } | null;
};

export type CafeTeamView = { id: string; name: string; cafeRole: string | null; role: string };

const item = (id: string, name: string, category: CafeCategory, price: number, calories: number | null, protein: number | null, stock: number | null = null): CafeItemView => ({
  id, name, category, price, calories, protein, stock, active: true,
});

export const DEMO_ITEMS: CafeItemView[] = [
  item("d1", "Espresso", "COFFEE", 12, 5, null),
  item("d2", "Flat White", "COFFEE", 18, 120, 7),
  item("d3", "Iced Spanish Latte", "COFFEE", 22, 210, 8),
  item("d4", "Protein Coffee", "COFFEE", 24, 180, 25),
  item("d5", "Whey Protein Shake", "SHAKE", 25, 230, 30, 42),
  item("d6", "Peanut Butter Banana Shake", "SHAKE", 28, 420, 32, 18),
  item("d7", "Berry Recovery Smoothie", "JUICE", 24, 260, 20),
  item("d8", "Green Detox Juice", "JUICE", 20, 140, 3),
  item("d9", "Fresh Orange Juice", "JUICE", 16, 110, 2),
  item("d10", "Protein Bar", "SNACK", 15, 210, 20, 36),
  item("d11", "Overnight Oats", "SNACK", 22, 350, 18, 9),
  item("d12", "Grilled Chicken Rice Bowl", "MEAL", 38, 560, 45, 12),
  item("d13", "Chicken Caesar Wrap", "MEAL", 32, 480, 36, 4),
  item("d14", "Electrolyte Water", "DRINK", 10, 20, null, 60),
];

const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const line = (i: number, qty = 1) => ({ itemId: DEMO_ITEMS[i]!.id, name: DEMO_ITEMS[i]!.name, price: DEMO_ITEMS[i]!.price, qty });

/** Total is worked out from the lines so the sample always adds up. */
const sale = (v: Omit<CafeSaleView, "total">): CafeSaleView => ({ ...v, total: v.items.reduce((a, l) => a + l.price * l.qty, 0) });

export const DEMO_SALES: CafeSaleView[] = [
  sale({ id: "s1", method: "CARD", items: [line(4), line(11)], createdAt: ago(6), member: { id: "m1", firstName: "James", lastName: "Carter" }, soldBy: { name: "Tom Ellis" } }),
  sale({ id: "s2", method: "CASH", items: [line(1, 2)], createdAt: ago(19), member: null, soldBy: { name: "Amy Palmer" } }),
  sale({ id: "s3", method: "CARD", items: [line(11)], createdAt: ago(34), member: { id: "m2", firstName: "Olivia", lastName: "Bennett" }, soldBy: { name: "Tom Ellis" } }),
  sale({ id: "s4", method: "TRANSFER", items: [line(5), line(9), line(0)], createdAt: ago(52), member: { id: "m3", firstName: "Daniel", lastName: "Brooks" }, soldBy: { name: "Lucy Barnes" } }),
  sale({ id: "s5", method: "CASH", items: [line(4)], createdAt: ago(71), member: null, soldBy: { name: "Amy Palmer" } }),
  sale({ id: "s6", method: "CARD", items: [line(3), line(7)], createdAt: ago(95), member: { id: "m4", firstName: "Sophie", lastName: "Turner" }, soldBy: { name: "Tom Ellis" } }),
];

export const DEMO_TODAY = {
  sales: 47,
  total: 1386,
  cash: 412,
  card: 861,
  transfer: 113,
  top: [
    { name: "Whey Protein Shake", qty: 14, revenue: 350 },
    { name: "Flat White", qty: 11, revenue: 198 },
    { name: "Grilled Chicken Rice Bowl", qty: 7, revenue: 266 },
    { name: "Protein Bar", qty: 6, revenue: 90 },
    { name: "Iced Spanish Latte", qty: 5, revenue: 110 },
  ],
};

export const DEMO_TEAM: CafeTeamView[] = [
  { id: "t1", name: "Lucy Barnes", cafeRole: "Café manager", role: "MANAGER" },
  { id: "t2", name: "Tom Ellis", cafeRole: "Barista", role: "RECEPTION" },
  { id: "t3", name: "Amy Palmer", cafeRole: "Barista", role: "HOUSEKEEPING" },
];

export const CAFE_FEATURES = [
  "A menu of up to 14 items with prices, calories and protein",
  "Ring up orders at the counter by cash, card or transfer",
  "Link orders to members, so you see who buys what",
  "Stock counts that go down with every sale",
  "Today's takings and best sellers at a glance",
  "A café team with their own roles",
];
