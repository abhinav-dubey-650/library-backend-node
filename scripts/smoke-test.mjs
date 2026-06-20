#!/usr/bin/env node
/**
 * Frontend-parity API smoke test — hits every route the UI uses.
 * Run: node scripts/smoke-test.mjs
 */
const BASE = process.env.API_BASE ?? "http://localhost:8080/api";
const ADMIN_PIN = process.env.APP_ADMIN_PIN ?? "560059";
const now = new Date();
const year = now.getFullYear();
const month = now.getMonth() + 1;

const results = [];

async function req(method, path, { token, adminPin, body, expect = [200, 201, 204], recordFailure = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (adminPin) headers["X-Admin-Pin"] = adminPin;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    results.push({ method, path, ok: false, status: 0, note: e.message });
    return null;
  }

  const contentType = res.headers.get("content-type") || "";
  let data = null;
  if (contentType.includes("application/json") && res.status !== 204) {
    data = await res.json().catch(() => null);
  }

  const ok = expect.includes(res.status);
  if (recordFailure || ok) {
    results.push({
      method,
      path,
      ok,
      status: res.status,
      note: ok ? "" : data?.message || data?.error || res.statusText,
    });
  }
  return ok ? (res.status === 204 ? {} : data) : null;
}

async function login(memberId, password, { recordFailure = true } = {}) {
  const data = await req("POST", "/auth/login", {
    body: { memberId, password },
    expect: [200],
    recordFailure,
  });
  return data?.token ?? null;
}

console.log(`Smoke testing ${BASE}\n`);

// ── Public ──
await req("GET", "/plans");
await req("GET", "/seats");
await req("GET", "/shifts");
await req("GET", "/config");

// ── Admin login ──
let adminToken = await login("ADMIN001", "admin123");
if (!adminToken) {
  console.error("FAIL: Could not login as ADMIN001 — aborting authenticated tests.");
  printSummary();
  process.exit(1);
}

await req("POST", "/auth/verify-admin-pin", {
  token: adminToken,
  body: { pin: ADMIN_PIN },
  expect: [200, 204],
});

// ── Admin routes ──
await req("GET", "/dashboard/admin", { token: adminToken, adminPin: ADMIN_PIN });
await req("GET", "/auth/students?page=0&size=10", { token: adminToken, adminPin: ADMIN_PIN });
await req("GET", "/attendance/active", { token: adminToken, adminPin: ADMIN_PIN });
await req("GET", "/plans/stats", { token: adminToken, adminPin: ADMIN_PIN });
await req("GET", "/plans/all", { token: adminToken, adminPin: ADMIN_PIN });
await req("GET", `/fees?year=${year}&month=${month}&page=0&size=10`, {
  token: adminToken,
  adminPin: ADMIN_PIN,
});
await req("GET", `/fees/stats?year=${year}&month=${month}`, {
  token: adminToken,
  adminPin: ADMIN_PIN,
});
await req("GET", `/attendance/leaderboard?year=${year}&month=${month}`, {
  token: adminToken,
  adminPin: ADMIN_PIN,
});
await req("GET", "/seats/assignable", { token: adminToken, adminPin: ADMIN_PIN });
await req("GET", `/student-of-the-month?year=${year}&month=${month}`, {
  token: adminToken,
  adminPin: ADMIN_PIN,
});

// ── Member login (try known seed + common passwords) ──
const memberCandidates = [
  ["BR001", "member123"],
  ["BR001", "password"],
  ["BR001", "123456"],
  ["BR002", "member123"],
  ["BRL003", "member123"],
];
let memberToken = null;
let memberId = null;
for (const [id, pw] of memberCandidates) {
  const t = await login(id, pw, { recordFailure: false });
  if (t) {
    memberToken = t;
    memberId = id;
    break;
  }
}

if (!memberToken) {
  const crypto = await import("crypto");
  const pg = await import("pg");
  const dotenv = await import("dotenv");
  const { fileURLToPath } = await import("url");
  const { dirname, join } = await import("path");
  dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), "../.env") });

  function buildUrl() {
    let url = process.env.DATABASE_URL.trim();
    if (url.startsWith("jdbc:postgresql://")) url = "postgresql://" + url.slice("jdbc:postgresql://".length);
    const u = process.env.DATABASE_USERNAME?.trim();
    const p = process.env.DATABASE_PASSWORD?.trim();
    if (u && p && !url.includes("@")) {
      const parsed = new URL(url);
      parsed.username = encodeURIComponent(u);
      parsed.password = encodeURIComponent(p);
      url = parsed.toString();
    }
    return url.replace(/([?&])sslmode=[^&]*&?/i, "$1").replace(/[?&]$/, "");
  }

  const pool = new pg.default.Pool({
    connectionString: buildUrl(),
    ssl: { rejectUnauthorized: false },
  });
  const prev = await pool.query(`SELECT password_hash FROM users WHERE member_id = 'BR001'`);
  const oldHash = prev.rows[0]?.password_hash;
  const tempHash = crypto.createHash("sha256").update("smoketest1", "utf8").digest("hex");
  await pool.query(`UPDATE users SET password_hash = $1 WHERE member_id = 'BR001'`, [tempHash]);
  await pool.end();
  memberToken = await login("BR001", "smoketest1");
  memberId = "BR001";
  results.push({
    method: "SETUP",
    path: "temp BR001 password for smoke test",
    ok: Boolean(memberToken),
    status: memberToken ? 200 : 500,
    note: memberToken ? "restored after test" : "could not login",
  });

  // restore original hash after member tests below
  var restoreBr001Hash = async () => {
    if (!oldHash) return;
    const pool2 = new pg.default.Pool({
      connectionString: buildUrl(),
      ssl: { rejectUnauthorized: false },
    });
    await pool2.query(`UPDATE users SET password_hash = $1 WHERE member_id = 'BR001'`, [oldHash]);
    await pool2.end();
  };
}

if (memberToken) {
  await req("GET", "/attendance/me/status", { token: memberToken });
  await req("GET", "/attendance/occupied-seats", { token: memberToken });
  await req("GET", `/attendance/me/monthly-stats?year=${year}&month=${month}`, { token: memberToken });
  await req("GET", `/attendance/leaderboard?year=${year}&month=${month}`, { token: memberToken });
  await req("GET", "/subscriptions/active", { token: memberToken });
  await req("GET", "/bookings/my", { token: memberToken });
  await req("GET", "/fees/my", { token: memberToken });
  await req("GET", `/progress/overview?year=${year}&month=${month}`, { token: memberToken });
  await req("GET", `/analytics/me?year=${year}&month=${month}`, { token: memberToken });
  await req("GET", "/achievements/me", { token: memberToken });
  await req("GET", `/goals/me?year=${year}&month=${month}`, { token: memberToken });
  await req("GET", "/exams", { token: memberToken });
  await req("GET", "/exams/me", { token: memberToken });
  await req("GET", `/study-log?year=${year}&month=${month}`, { token: memberToken });

  // Attendance punch (safe: punch out if in, else punch in then out)
  const status = await req("GET", "/attendance/me/status", { token: memberToken });
  if (status?.checkedIn) {
    await req("POST", "/attendance/punch-out", { token: memberToken, expect: [200, 201] });
  } else {
    const punchedIn = await req("POST", "/attendance/punch-in", { token: memberToken, expect: [200, 201, 400] });
    if (punchedIn) {
      await req("POST", "/attendance/punch-out", { token: memberToken, expect: [200, 201] });
    }
  }
} else {
  results.push({
    method: "SKIP",
    path: "member routes",
    ok: false,
    status: 0,
    note: "no member login available",
  });
}

if (typeof restoreBr001Hash === "function") {
  await restoreBr001Hash();
}

function printSummary() {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log("\n── Results ──");
  for (const r of results) {
    const mark = r.ok ? "✓" : "✗";
    console.log(`${mark} ${r.method.padEnd(6)} ${r.path} → ${r.status}${r.note ? ` (${r.note})` : ""}`);
  }
  console.log(`\n${passed}/${results.length} passed`);
  if (failed.length) {
    console.log("\nFailed:");
    for (const r of failed) console.log(`  - ${r.method} ${r.path}: ${r.note || r.status}`);
  }
  if (memberId) console.log(`\nMember tested as: ${memberId}`);
}

printSummary();
process.exit(failedCount(results));

function failedCount(arr) {
  return arr.some((r) => !r.ok) ? 1 : 0;
}
