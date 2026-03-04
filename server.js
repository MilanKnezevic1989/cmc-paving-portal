const express = require("express");
const Database = require("better-sqlite3");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ── Database setup ──
const DB_PATH = path.join(__dirname, ".data", "orders.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    company TEXT NOT NULL,
    user_type TEXT NOT NULL CHECK(user_type IN ('cmc','customer')),
    role TEXT DEFAULT 'user',
    linked_projects TEXT DEFAULT '[]'
  );
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_data TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// ── Seed CMC staff + test customers if empty ──
function simpleHash(str) {
  return crypto.createHash("sha256").update(str).digest("hex").slice(0, 16);
}

const userCount = db.prepare("SELECT COUNT(*) as cnt FROM users").get().cnt;
if (userCount === 0) {
  const insert = db.prepare("INSERT INTO users (username, password_hash, display_name, company, user_type, role, linked_projects) VALUES (?,?,?,?,?,?,?)");
  // CMC Staff
  insert.run("milan", simpleHash("cmc2026"), "Milan Knezevic", "CMC", "cmc", "admin", "[]");
  insert.run("robin", simpleHash("cmc2026"), "Robin McElroy", "CMC", "cmc", "rep", "[]");
  insert.run("jesse", simpleHash("cmc2026"), "Jesse Miller Jr.", "CMC", "cmc", "rep", "[]");
  // Test customer accounts
  insert.run("webber_admin", simpleHash("webber2026"), "John Smith", "Webber", "customer", "user", JSON.stringify(["1200P1032", "1200P796"]));
  insert.run("zachry_admin", simpleHash("zachry2026"), "Rob Nash", "Zachry Construction", "customer", "user", JSON.stringify(["1200P1075", "1200P627"]));
  insert.run("breda_admin", simpleHash("breda2026"), "Dave Wilson", "Breda Co", "customer", "user", JSON.stringify(["1200P722"]));
  insert.run("robnash", simpleHash("rob2026"), "Rob Nash", "Test Account", "customer", "user", "[]");
  console.log("Seeded 7 user accounts.");
}

// Seed sample orders if empty
const orderCount = db.prepare("SELECT COUNT(*) as cnt FROM orders").get().cnt;
if (orderCount === 0) {
  const seedOrders = require("./seed-orders.js");
  const ins = db.prepare("INSERT INTO orders (id, order_data, updated_at) VALUES (?, ?, datetime('now'))");
  for (const o of seedOrders) {
    ins.run(o.id, JSON.stringify(o));
  }
  console.log(`Seeded ${seedOrders.length} sample orders.`);
}

// ── Session management (in-memory, simple) ──
const sessions = {};

function createSession(user) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions[token] = { ...user, createdAt: Date.now() };
  return token;
}

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token || !sessions[token]) return res.status(401).json({ error: "Not authenticated" });
  req.user = sessions[token];
  next();
}

// ── AUTH ROUTES ──

app.post("/api/auth/login", (req, res) => {
  const { username, password, portalType } = req.body;
  const hash = simpleHash(password);
  const user = db.prepare("SELECT * FROM users WHERE username = ? AND password_hash = ?").get(username.toLowerCase().trim(), hash);
  if (!user) return res.status(401).json({ error: "Invalid username or password." });
  if (portalType === "cmc" && user.user_type !== "cmc") return res.status(401).json({ error: "Not a CMC account." });
  if (portalType === "customer" && user.user_type !== "customer") return res.status(401).json({ error: "Not a customer account." });

  const token = createSession({
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    company: user.company,
    type: user.user_type,
    role: user.role,
    linkedProjects: JSON.parse(user.linked_projects),
  });
  res.json({
    token,
    user: { username: user.username, displayName: user.display_name, company: user.company, type: user.user_type, role: user.role, linkedProjects: JSON.parse(user.linked_projects) },
  });
});

app.post("/api/auth/register", (req, res) => {
  const { username, password, displayName, company } = req.body;
  if (!username || !password || !displayName || !company) return res.status(400).json({ error: "All fields required." });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });

  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username.toLowerCase().trim());
  if (existing) return res.status(400).json({ error: "Username already taken." });

  const hash = simpleHash(password);
  const result = db.prepare("INSERT INTO users (username, password_hash, display_name, company, user_type, role, linked_projects) VALUES (?,?,?,?,?,?,?)").run(
    username.toLowerCase().trim(), hash, displayName.trim(), company.trim(), "customer", "user", "[]"
  );

  const user = { id: result.lastInsertRowid, username: username.toLowerCase().trim(), displayName: displayName.trim(), company: company.trim(), type: "customer", role: "user", linkedProjects: [] };
  const token = createSession(user);
  res.json({ token, user });
});

app.post("/api/auth/logout", requireAuth, (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  delete sessions[token];
  res.json({ ok: true });
});

// ── PROJECT LINKING ──

app.post("/api/users/link-project", requireAuth, (req, res) => {
  const { jobNumber } = req.body;
  const linked = JSON.parse(
    db.prepare("SELECT linked_projects FROM users WHERE id = ?").get(req.user.id).linked_projects
  );
  if (!linked.includes(jobNumber)) linked.push(jobNumber);
  db.prepare("UPDATE users SET linked_projects = ? WHERE id = ?").run(JSON.stringify(linked), req.user.id);
  // Update session
  req.user.linkedProjects = linked;
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (sessions[token]) sessions[token].linkedProjects = linked;
  res.json({ linkedProjects: linked });
});

// ── ORDER ROUTES ──

app.get("/api/orders", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT order_data FROM orders").all();
  let orders = rows.map((r) => JSON.parse(r.order_data));

  // For customers, only return orders for their linked projects
  if (req.user.type === "customer") {
    const linked = req.user.linkedProjects || [];
    orders = orders.filter((o) => linked.includes(o.jobNumber));
  }

  res.json(orders);
});

app.post("/api/orders", requireAuth, (req, res) => {
  const order = req.body;
  if (!order.id) order.id = "ord_" + crypto.randomBytes(4).toString("hex");
  db.prepare("INSERT INTO orders (id, order_data, updated_at) VALUES (?, ?, datetime('now'))").run(order.id, JSON.stringify(order));
  res.json(order);
});

app.put("/api/orders/:id", requireAuth, (req, res) => {
  const order = req.body;
  const existing = db.prepare("SELECT id FROM orders WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Order not found" });
  db.prepare("UPDATE orders SET order_data = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(order), req.params.id);
  res.json(order);
});

// ── CSV EXPORT ──

app.get("/api/export/csv", requireAuth, (req, res) => {
  const WEIGHT_FACTORS = { "#3": 0.376, "#4": 0.668, "#5": 1.043, "#6": 1.502, "#7": 2.044, "#8": 2.670 };
  const LINE_LABELS = { longitudinal: "#6 Longitudinal", transverse: "#5 Transverse", singlepiece: "#6 Single Piece Tie Bar", other: "Other (Non-Standard)" };
  function calcTons(f, i, pcs, bdl, bar) { return ((f + i / 12) * pcs * bdl * (WEIGHT_FACTORS[bar] || 0)) / 2000; }

  const rows = db.prepare("SELECT order_data FROM orders").all();
  const orders = rows.map((r) => JSON.parse(r.order_data));
  const headers = ["Job Number", "Job Name", "Order Number", "Delivery Date", "Status", "Customer", "Segment", "Type", "Bar Size", "Length", "Pcs/Bundle", "# Bundles", "Tons"];
  const csvRows = [headers.map((h) => `"${h}"`).join(",")];

  for (const o of orders) {
    for (const l of o.lines || []) {
      const tons = calcTons(l.feet, l.inches, l.pcsPerBundle, l.numBundles, l.barSize).toFixed(2);
      csvRows.push(
        [o.jobNumber, o.jobName, o.orderNumber, o.deliveryDate, o.status, o.customer, o.segment, LINE_LABELS[l.lineType] || l.lineType, l.barSize, `${l.feet}'${l.inches}"`, l.pcsPerBundle, l.numBundles, tons]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      );
    }
  }

  const csv = csvRows.join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="CMC_Orders_${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});

// ── Catch-all: serve index.html for client-side routing ──
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`CMC Paving Portal running on port ${PORT}`));
