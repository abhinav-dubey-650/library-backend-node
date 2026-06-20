import { PoolClient } from "pg";
import { SimpleDatabase } from "../../core/database/SimpleDatabase";
import { USER_COLUMNS, SEAT_COLUMNS } from "../auth/auth.repository";
import { istToday } from "../../shared/ist";

const SHIFT_COLUMNS = `id, name, start_time, end_time, is_active, created_at`;
const BOOKING_COLUMNS = `id, user_id, seat_id, shift_id, subscription_id, booking_date, status, created_at`;

type Runner = Pick<typeof SimpleDatabase, "query"> | PoolClient;

function run(runner: Runner | undefined, text: string, params: any[]) {
  if (runner && runner !== (SimpleDatabase as unknown)) {
    return (runner as PoolClient).query(text, params);
  }
  return SimpleDatabase.query(text, params);
}

export async function findAllSeats() {
  const res = await SimpleDatabase.query(`SELECT ${SEAT_COLUMNS} FROM seats ORDER BY id`, []);
  return res.rows;
}

export async function findSeatById(id: number, runner?: Runner) {
  const res = await run(runner, `SELECT ${SEAT_COLUMNS} FROM seats WHERE id = $1`, [id]);
  return res.rows[0] ?? null;
}

export async function insertSeat(seatNumber: string, status: string, hasPowerOutlet: boolean, runner?: Runner) {
  const res = await run(
    runner,
    `INSERT INTO seats (seat_number, status, has_power_outlet) VALUES ($1, $2, $3) RETURNING ${SEAT_COLUMNS}`,
    [seatNumber, status, hasPowerOutlet]
  );
  return res.rows[0];
}

export async function updateSeatStatus(id: number, status: string, runner?: Runner) {
  const res = await run(runner, `UPDATE seats SET status = $2 WHERE id = $1 RETURNING ${SEAT_COLUMNS}`, [id, status]);
  return res.rows[0] ?? null;
}

export async function deleteSeat(id: number, runner?: Runner) {
  await run(runner, `DELETE FROM seats WHERE id = $1`, [id]);
}

export async function existsByAssignedSeatId(seatId: number): Promise<boolean> {
  const res = await SimpleDatabase.query(`SELECT 1 FROM users WHERE assigned_seat_id = $1 LIMIT 1`, [seatId]);
  return res.rows.length > 0;
}

export async function existsBookingBySeatId(seatId: number): Promise<boolean> {
  const res = await SimpleDatabase.query(`SELECT 1 FROM bookings WHERE seat_id = $1 LIMIT 1`, [seatId]);
  return res.rows.length > 0;
}

export async function isSeatTakenByAnotherActiveMember(
  seatId: number,
  excludeUserId: number | null
): Promise<boolean> {
  const res = await SimpleDatabase.query(
    `SELECT EXISTS(
       SELECT 1 FROM users
       WHERE assigned_seat_id = $1 AND role = 'MEMBER' AND is_active = true
         AND ($2::bigint IS NULL OR id <> $2)
     ) AS taken`,
    [seatId, excludeUserId]
  );
  return res.rows[0]?.taken === true;
}

/** Active members on a seat with their plan shift window (if any). */
export async function findActiveSeatOccupants(seatId: number, excludeUserId: number | null) {
  const today = istToday();
  const res = await SimpleDatabase.query(
    `SELECT u.id AS user_id, u.member_id, mp.shift_id,
            s.start_time, s.end_time, s.name AS shift_name
     FROM users u
     JOIN subscriptions sub ON sub.user_id = u.id AND sub.status = 'ACTIVE'
       AND $3::date BETWEEN sub.start_date AND sub.end_date
     JOIN membership_plans mp ON mp.id = sub.plan_id
     LEFT JOIN shifts s ON s.id = mp.shift_id
     WHERE u.assigned_seat_id = $1 AND u.role = 'MEMBER' AND u.is_active = true
       AND ($2::bigint IS NULL OR u.id <> $2)`,
    [seatId, excludeUserId, today]
  );
  return res.rows;
}

/** Active members with assigned seats and plan shift for seat-map reserved counts. */
export async function findAllActiveSeatAssignments() {
  const today = istToday();
  const res = await SimpleDatabase.query(
    `SELECT u.id AS user_id, u.member_id, u.assigned_seat_id AS seat_id,
            mp.shift_id, s.start_time, s.end_time, s.name AS shift_name
     FROM users u
     JOIN subscriptions sub ON sub.user_id = u.id AND sub.status = 'ACTIVE'
       AND $1::date BETWEEN sub.start_date AND sub.end_date
     JOIN membership_plans mp ON mp.id = sub.plan_id
     LEFT JOIN shifts s ON s.id = mp.shift_id
     WHERE u.role = 'MEMBER' AND u.is_active = true AND u.assigned_seat_id IS NOT NULL`,
    [today]
  );
  return res.rows;
}

export async function findAllShifts() {
  const res = await SimpleDatabase.query(`SELECT ${SHIFT_COLUMNS} FROM shifts ORDER BY id`, []);
  return res.rows;
}

export async function findShiftById(id: number, runner?: Runner) {
  const res = await run(runner, `SELECT ${SHIFT_COLUMNS} FROM shifts WHERE id = $1`, [id]);
  return res.rows[0] ?? null;
}

export async function insertShift(name: string, startTime: string, endTime: string, runner?: Runner) {
  const res = await run(
    runner,
    `INSERT INTO shifts (name, start_time, end_time, is_active) VALUES ($1, $2, $3, true) RETURNING ${SHIFT_COLUMNS}`,
    [name, startTime, endTime]
  );
  return res.rows[0];
}

export async function updateShift(id: number, name: string, startTime: string, endTime: string, runner?: Runner) {
  const res = await run(
    runner,
    `UPDATE shifts SET name = $2, start_time = $3, end_time = $4 WHERE id = $1 RETURNING ${SHIFT_COLUMNS}`,
    [id, name, startTime, endTime]
  );
  return res.rows[0] ?? null;
}

export async function deactivateShift(id: number, runner?: Runner) {
  const res = await run(
    runner,
    `UPDATE shifts SET is_active = false WHERE id = $1 RETURNING ${SHIFT_COLUMNS}`,
    [id]
  );
  return res.rows[0] ?? null;
}

export async function findBookingsByDate(date: string) {
  const res = await SimpleDatabase.query(
    `SELECT ${BOOKING_COLUMNS} FROM bookings WHERE booking_date = $1 ORDER BY id`,
    [date]
  );
  return res.rows;
}

export async function findBookingsByUserId(userId: number) {
  const res = await SimpleDatabase.query(
    `SELECT ${BOOKING_COLUMNS} FROM bookings WHERE user_id = $1 ORDER BY booking_date DESC, id DESC`,
    [userId]
  );
  return res.rows;
}

export async function findBookingById(id: number, runner?: Runner) {
  const res = await run(runner, `SELECT ${BOOKING_COLUMNS} FROM bookings WHERE id = $1`, [id]);
  return res.rows[0] ?? null;
}

export async function findActiveBookingBySeatShiftAndDate(seatId: number, shiftId: number, date: string) {
  const res = await SimpleDatabase.query(
    `SELECT ${BOOKING_COLUMNS} FROM bookings
     WHERE seat_id = $1 AND shift_id = $2 AND booking_date = $3 AND status = 'ACTIVE' LIMIT 1`,
    [seatId, shiftId, date]
  );
  return res.rows[0] ?? null;
}

export async function findActiveBookingsForUserOnDate(userId: number, date: string) {
  const res = await SimpleDatabase.query(
    `SELECT ${BOOKING_COLUMNS} FROM bookings
     WHERE user_id = $1 AND booking_date = $2 AND status = 'ACTIVE' ORDER BY id`,
    [userId, date]
  );
  return res.rows;
}

export async function insertBooking(
  userId: number,
  seatId: number,
  shiftId: number,
  subscriptionId: number,
  bookingDate: string,
  runner?: Runner
) {
  const res = await run(
    runner,
    `INSERT INTO bookings (user_id, seat_id, shift_id, subscription_id, booking_date, status)
     VALUES ($1, $2, $3, $4, $5, 'ACTIVE') RETURNING ${BOOKING_COLUMNS}`,
    [userId, seatId, shiftId, subscriptionId, bookingDate]
  );
  return res.rows[0];
}

export async function cancelBooking(id: number, runner?: Runner) {
  const res = await run(
    runner,
    `UPDATE bookings SET status = 'CANCELLED' WHERE id = $1 RETURNING ${BOOKING_COLUMNS}`,
    [id]
  );
  return res.rows[0] ?? null;
}

export async function findUserById(userId: number) {
  const res = await SimpleDatabase.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [userId]);
  return res.rows[0] ?? null;
}

export async function findActiveSubscriptionForUser(userId: number, date: string) {
  const res = await SimpleDatabase.query(
    `SELECT id, user_id, plan_id, start_date, end_date, status, paid_amount, payment_method, payment_status, created_at
     FROM subscriptions
     WHERE user_id = $1 AND status = 'ACTIVE' AND $2::date BETWEEN start_date AND end_date
     LIMIT 1`,
    [userId, date]
  );
  return res.rows[0] ?? null;
}

export { SEAT_COLUMNS, SHIFT_COLUMNS, BOOKING_COLUMNS };
