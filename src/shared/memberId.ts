import { PoolClient } from "pg";

/**
 * Generate the next member id — port of UserService.generateNextMemberId.
 * Reads prefix / digits / counter from library_config, increments the counter,
 * and formats as `${prefix}${zeroPaddedCounter}` (e.g. BR001).
 *
 * Must run inside a transaction; we lock the counter row FOR UPDATE so concurrent
 * registrations can't collide (stronger than the Java version, schema-compatible).
 */
export async function generateNextMemberId(client: PoolClient): Promise<string> {
  const cfg = await client.query(
    `SELECT config_key, config_value FROM library_config
      WHERE config_key IN ('member_id_prefix', 'member_id_digits', 'member_id_counter')`
  );
  const map = new Map<string, string>(cfg.rows.map((r: any) => [r.config_key, r.config_value]));

  const prefix = (map.get("member_id_prefix") ?? "LIB").toUpperCase().replace(/[^A-Z0-9]/g, "");

  let digits = 3;
  const digitsRaw = map.get("member_id_digits");
  if (digitsRaw !== undefined) {
    const parsed = Number.parseInt(digitsRaw, 10);
    if (!Number.isNaN(parsed)) digits = parsed;
  }

  if (!map.has("member_id_counter")) {
    throw new Error("member_id_counter config missing");
  }

  // Lock + bump the counter atomically.
  const locked = await client.query(
    `SELECT config_value FROM library_config WHERE config_key = 'member_id_counter' FOR UPDATE`
  );
  const next = Number.parseInt(locked.rows[0].config_value, 10) + 1;
  await client.query(
    `UPDATE library_config SET config_value = $1, updated_at = NOW() WHERE config_key = 'member_id_counter'`,
    [String(next)]
  );

  return prefix + String(next).padStart(digits, "0");
}
