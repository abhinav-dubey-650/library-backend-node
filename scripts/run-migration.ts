import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SimpleDatabase } from "../src/core/database/SimpleDatabase";
import { closeDatabaseConnections } from "../src/config/database";

async function main() {
  const file = process.argv[2] ?? "V16__branding_whatsapp_config.sql";
  const sql = readFileSync(join(__dirname, "migrations", file), "utf8");
  await SimpleDatabase.query(sql, []);
  console.log(`Applied migration: ${file}`);
  await closeDatabaseConnections();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
