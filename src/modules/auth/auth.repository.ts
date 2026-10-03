import { PoolClient } from "pg";
import { SimpleDatabase } from "../../core/database/SimpleDatabase";

const USER_COLUMNS = `id, member_id, email, password_hash, full_name, role, phone_number,
  address, dob, whatsapp_consent, is_active, last_login_at, assigned_seat_id, created_at`;

const SEAT_COLUMNS = `id, seat_number, status, has_power_outlet, created_at`;

type Runner = Pick<typeof SimpleDatabase, "query"> | PoolClient;

function run(runner: Runner | undefined, text: string, params: any[]) {
  if (runner && "query" in runner && typeof (runner as any).query === "function" && runner !== SimpleDatabase) {
    return (runner as PoolClient).query(text, params);
  }
  return SimpleDatabase.query(text, params);
}

export async function findById(id: number) {
  const res = await SimpleDatabase.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id]);
  return res.rows[0] ?? null;
}

export async function findByMemberIdExact(memberId: string) {
  const res = await SimpleDatabase.query(`SELECT ${USER_COLUMNS} FROM users WHERE member_id = $1`, [memberId]);
  return res.rows[0] ?? null;
}

/** Port of findByMemberIdNormalized: REPLACE(UPPER(member_id),'-','') = :normalized */
export async function findByMemberIdNormalized(normalized: string) {
  const res = await SimpleDatabase.query(
    `SELECT ${USER_COLUMNS} FROM users WHERE REPLACE(UPPER(member_id), '-', '') = $1`,
    [normalized]
  );
  return res.rows[0] ?? null;
}

export async function findByEmail(email: string) {
  const res = await SimpleDatabase.query(`SELECT ${USER_COLUMNS} FROM users WHERE email = $1`, [email]);
  return res.rows[0] ?? null;
}

export async function existsByEmail(email: string): Promise<boolean> {
  const res = await SimpleDatabase.query(`SELECT 1 FROM users WHERE email = $1 LIMIT 1`, [email]);
  return res.rows.length > 0;
}

export async function findAllMembers() {
  const res = await SimpleDatabase.query(
    `SELECT ${USER_COLUMNS} FROM users WHERE role = 'MEMBER' ORDER BY id`,
    []
  );
  return res.rows;
}

export async function findAllOrderByCreatedAtDesc() {
  const res = await SimpleDatabase.query(`SELECT ${USER_COLUMNS} FROM users ORDER BY created_at DESC`, []);
  return res.rows;
}

export async function findSeatById(seatId: number, runner?: Runner) {
  const res = await run(runner, `SELECT ${SEAT_COLUMNS} FROM seats WHERE id = $1`, [seatId]);
  return res.rows[0] ?? null;
}

/** Map of user_id -> seat row, for embedding assignedSeat on a list of users. */
export async function loadSeatsForUsers(userRows: any[]): Promise<Map<number, any>> {
  const seatIds = [...new Set(userRows.map((u) => u.assigned_seat_id).filter((x) => x != null))];
  const map = new Map<number, any>();
  if (seatIds.length === 0) return map;
  const res = await SimpleDatabase.query(`SELECT ${SEAT_COLUMNS} FROM seats WHERE id = ANY($1::bigint[])`, [seatIds]);
  for (const s of res.rows) map.set(Number(s.id), s);
  return map;
}

/** Port of isSeatTakenByAnotherActiveMember. */
export async function isSeatTakenByAnotherActiveMember(
  seatId: number,
  excludeUserId: number | null,
  runner?: Runner
): Promise<boolean> {
  const res = await run(
    runner,
    `SELECT 1 FROM users
      WHERE assigned_seat_id = $1 AND role = 'MEMBER' AND is_active = true
        AND ($2::bigint IS NULL OR id <> $2)
      LIMIT 1`,
    [seatId, excludeUserId]
  );
  return res.rows.length > 0;
}

/**
 * Port of searchStudents — role=MEMBER, optional fuzzy search across full_name /
 * member_id / phone_number / seat_number, and status filter. Returns a Spring-style page.
 */
export async function searchStudents(
  search: string | null,
  status: string,
  page: number,
  size: number
) {
  const where = `users.role = 'MEMBER'
      AND ($1::text IS NULL OR $1 = '' OR
           LOWER(users.full_name) LIKE LOWER('%' || $1 || '%') OR
           LOWER(users.member_id) LIKE LOWER('%' || $1 || '%') OR
           users.phone_number LIKE '%' || $1 || '%' OR
           LOWER(s.seat_number) LIKE LOWER('%' || $1 || '%'))
      AND ($2 = 'all' OR ($2 = 'active' AND users.is_active = true) OR ($2 = 'inactive' AND users.is_active = false))`;
  const from = `users LEFT JOIN seats s ON s.id = users.assigned_seat_id`;
  const userCols = USER_COLUMNS.split(",")
    .map((c) => `users.${c.trim()}`)
    .join(", ");

  const countRes = await SimpleDatabase.query(`SELECT COUNT(*)::bigint AS c FROM ${from} WHERE ${where}`, [
    search,
    status,
  ]);
  const total = Number(countRes.rows[0].c);

  const rowsRes = await SimpleDatabase.query(
    `SELECT ${userCols},
       (SELECT mp.shift_id FROM subscriptions sub
          JOIN membership_plans mp ON mp.id = sub.plan_id
          WHERE sub.user_id = users.id AND sub.status = 'ACTIVE'
            AND CURRENT_DATE BETWEEN sub.start_date AND sub.end_date
          ORDER BY sub.id DESC LIMIT 1) AS current_shift_id,
        (SELECT sub.discount_percent FROM subscriptions sub
          WHERE sub.user_id = users.id AND sub.status = 'ACTIVE'
            AND CURRENT_DATE BETWEEN sub.start_date AND sub.end_date
          ORDER BY sub.id DESC LIMIT 1) AS current_discount_percent
      FROM ${from} WHERE ${where}
       ORDER BY users.created_at DESC
       LIMIT $3 OFFSET $4`,
    [search, status, size, page * size]
  );

  return { rows: rowsRes.rows, total };
}

export async function updateUser(id: number, fields: Record<string, any>, runner?: Runner) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return findById(id);
  const set = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
  const res = await run(
    runner,
    `UPDATE users SET ${set} WHERE id = $1 RETURNING ${USER_COLUMNS}`,
    [id, ...keys.map((k) => fields[k])]
  );
  return res.rows[0] ?? null;
}

/**
 * Full student export: one row per MEMBER with assigned seat, current/latest
 * shift (via subscription -> plan -> shift) and latest fee invoice.
 * Sorted by seat number in natural order (Seat-1, Seat-2, … Seat-10),
 * unassigned seats last.
 */
export async function exportStudents(status: string) {
  const res = await SimpleDatabase.query(
    `SELECT
       u.id, u.member_id, u.full_name, u.phone_number, u.is_active,
       s.seat_number,
       sh.name AS shift_name,
       sub.start_date AS sub_start_date, sub.end_date AS sub_end_date,
       mp.duration_days AS duration_days,
       fi.generated_at AS last_generated_at, fi.due_date AS last_due_date,
       fi.amount AS last_amount, fi.amount_paid AS last_amount_paid,
       fi.status AS last_status,
       fi.billing_year AS last_billing_year, fi.billing_month AS last_billing_month,
       fi.plan_name AS last_plan_name
     FROM users u
     LEFT JOIN seats s ON s.id = u.assigned_seat_id
     LEFT JOIN LATERAL (
       SELECT sub2.start_date, sub2.end_date, sub2.plan_id
       FROM subscriptions sub2
       WHERE sub2.user_id = u.id
       ORDER BY
         CASE WHEN sub2.status = 'ACTIVE' AND CURRENT_DATE BETWEEN sub2.start_date AND sub2.end_date THEN 0 ELSE 1 END,
         sub2.end_date DESC, sub2.id DESC
       LIMIT 1
     ) sub ON true
     LEFT JOIN membership_plans mp ON mp.id = sub.plan_id
     LEFT JOIN shifts sh ON sh.id = mp.shift_id
     LEFT JOIN LATERAL (
       SELECT fi2.generated_at, fi2.due_date, fi2.amount, fi2.amount_paid, fi2.status,
              fi2.billing_year, fi2.billing_month, fi2.plan_name
       FROM fee_invoices fi2
       WHERE fi2.user_id = u.id
       ORDER BY fi2.generated_at DESC
       LIMIT 1
     ) fi ON true
     WHERE u.role = 'MEMBER'
       AND ($1 = 'all' OR ($1 = 'active' AND u.is_active = true) OR ($1 = 'inactive' AND u.is_active = false))
     ORDER BY
       CASE WHEN s.seat_number IS NULL THEN 1 ELSE 0 END,
       COALESCE(NULLIF(regexp_replace(s.seat_number, '[^0-9]', '', 'g'), '')::int, 999999),
       s.seat_number,
       u.full_name ASC`,
    [status]
  );
  return res.rows;
}

export { USER_COLUMNS, SEAT_COLUMNS };
