import "./dist/config/env.js";
const { pool } = await import("./dist/config/database.js");
const r = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`);
console.log(">>> TABLES", JSON.stringify(r.rows.map(x=>x.table_name)));
