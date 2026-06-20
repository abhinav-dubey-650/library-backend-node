import { SimpleDatabase } from "../../core/database/SimpleDatabase";

export async function findAllConfigs() {
  const res = await SimpleDatabase.query(
    `SELECT config_key, config_value, description, updated_at FROM library_config ORDER BY config_key`,
    []
  );
  return res.rows;
}

export async function findConfigByKey(key: string) {
  const res = await SimpleDatabase.query(
    `SELECT config_key, config_value, description, updated_at FROM library_config WHERE config_key = $1`,
    [key]
  );
  return res.rows[0] ?? null;
}

export async function updateConfig(key: string, value: string) {
  const res = await SimpleDatabase.query(
    `UPDATE library_config SET config_value = $2 WHERE config_key = $1
     RETURNING config_key, config_value, description, updated_at`,
    [key, value]
  );
  return res.rows[0] ?? null;
}
