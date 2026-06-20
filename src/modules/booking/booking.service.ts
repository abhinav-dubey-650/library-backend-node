import { PoolClient } from "pg";
import { AppError } from "../../core/errors/AppError";
import { SimpleDatabase } from "../../core/database/SimpleDatabase";
import { serializeBooking, serializeSeat, serializeShift } from "../../shared/serializers";
import { shiftBlocksSeat, type ShiftTimes } from "../../shared/shift-utils";
import { istToday } from "../../shared/ist";
import * as repo from "./booking.repository";
import * as authRepo from "../auth/auth.repository";
import type { BookingRequestInput, ShiftRequestInput } from "./booking.validator";

async function loadBookingJson(row: any) {
  const [user, seat, shift, sub] = await Promise.all([
    repo.findUserById(Number(row.user_id)),
    repo.findSeatById(Number(row.seat_id)),
    repo.findShiftById(Number(row.shift_id)),
    SimpleDatabase.query(
      `SELECT id, user_id, plan_id, start_date, end_date, status, paid_amount, payment_method, payment_status, created_at
       FROM subscriptions WHERE id = $1`,
      [row.subscription_id]
    ).then((r) => r.rows[0] ?? null),
  ]);

  let userSeat = null;
  if (user?.assigned_seat_id != null) {
    userSeat = await authRepo.findSeatById(Number(user.assigned_seat_id));
  }

  const subscription = sub
    ? {
        id: Number(sub.id),
        startDate: String(sub.start_date).substring(0, 10),
        endDate: String(sub.end_date).substring(0, 10),
        status: sub.status,
        paidAmount: Number(sub.paid_amount),
        paymentMethod: sub.payment_method ?? null,
        paymentStatus: sub.payment_status,
        createdAt: sub.created_at,
      }
    : null;

  return serializeBooking(row, user ? { ...user, _assignedSeat: userSeat } : null, seat, shift, subscription);
}

async function loadBookingsJson(rows: any[]) {
  return Promise.all(rows.map((r) => loadBookingJson(r)));
}

export async function getAllSeats() {
  const rows = await repo.findAllSeats();
  return rows.map(serializeSeat);
}

function occupantShiftTimes(row: { start_time?: string | null; end_time?: string | null }): ShiftTimes | null {
  if (!row.start_time || !row.end_time) return null;
  return {
    startTime: String(row.start_time).substring(0, 8),
    endTime: String(row.end_time).substring(0, 8),
  };
}

async function resolveTargetShift(shiftId: number | null, planId: number | null): Promise<ShiftTimes | null> {
  if (shiftId != null) {
    const shift = await repo.findShiftById(shiftId);
    if (!shift) throw AppError.badRequest(`Shift not found: ${shiftId}`);
    return {
      startTime: String(shift.start_time).substring(0, 8),
      endTime: String(shift.end_time).substring(0, 8),
    };
  }
  if (planId != null) {
    const planRes = await SimpleDatabase.query(`SELECT shift_id FROM membership_plans WHERE id = $1`, [planId]);
    const planShiftId = planRes.rows[0]?.shift_id;
    if (planShiftId == null) return null;
    const shift = await repo.findShiftById(Number(planShiftId));
    if (!shift) return null;
    return {
      startTime: String(shift.start_time).substring(0, 8),
      endTime: String(shift.end_time).substring(0, 8),
    };
  }
  return null;
}

async function isSeatBlockedForShift(
  seatId: number,
  targetShift: ShiftTimes | null,
  excludeUserId: number | null
): Promise<boolean> {
  if (!targetShift) {
    return repo.isSeatTakenByAnotherActiveMember(seatId, excludeUserId);
  }
  const occupants = await repo.findActiveSeatOccupants(seatId, excludeUserId);
  return occupants.some((o) => shiftBlocksSeat(occupantShiftTimes(o), targetShift));
}

export async function getAssignableSeats(
  excludeUserId: number | null | undefined,
  shiftId?: number | null,
  planId?: number | null
) {
  const seats = await repo.findAllSeats();
  const exclude = excludeUserId ?? null;
  const targetShift = await resolveTargetShift(shiftId ?? null, planId ?? null);
  const result = [];
  for (const s of seats) {
    if (s.status === "MAINTENANCE") continue;
    const blocked = await isSeatBlockedForShift(Number(s.id), targetShift, exclude);
    if (!blocked) result.push(serializeSeat(s));
  }
  return result;
}

export async function addSeat(body: { seatNumber?: string; status?: string; hasPowerOutlet?: boolean }) {
  const seatNumber = body.seatNumber ?? `Seat-${Date.now()}`;
  const status = body.status ?? "AVAILABLE";
  const hasPowerOutlet = body.hasPowerOutlet ?? true;
  const row = await repo.insertSeat(seatNumber, status, hasPowerOutlet);
  return serializeSeat(row);
}

export async function updateSeatStatus(seatId: number, status: string) {
  const row = await repo.updateSeatStatus(seatId, status);
  if (!row) throw AppError.badRequest("Seat not found");
  return serializeSeat(row);
}

export async function getAllShifts() {
  return (await repo.findAllShifts()).map(serializeShift);
}

export async function addShift(shift: { name: string; startTime: string; endTime: string }) {
  const row = await repo.insertShift(shift.name, shift.startTime, shift.endTime);
  return serializeShift(row);
}

export async function updateShift(id: number, request: ShiftRequestInput) {
  const row = await repo.updateShift(id, request.name, request.startTime, request.endTime);
  if (!row) throw AppError.badRequest("Shift not found");
  return serializeShift(row);
}

export async function deleteShift(id: number) {
  const row = await repo.deactivateShift(id);
  if (!row) throw AppError.badRequest("Shift not found");
}

export async function getBookingsByDate(date: string) {
  return loadBookingsJson(await repo.findBookingsByDate(date));
}

export async function getUserBookings(userId: number) {
  return loadBookingsJson(await repo.findBookingsByUserId(userId));
}

export async function createBooking(userId: number, request: BookingRequestInput) {
  const user = await repo.findUserById(userId);
  if (!user) throw AppError.badRequest("User not found");

  const activeSub = await repo.findActiveSubscriptionForUser(userId, request.bookingDate);
  if (!activeSub) {
    throw AppError.badRequest(`No active membership found for date: ${request.bookingDate}`);
  }

  const seat = await repo.findSeatById(request.seatId);
  if (!seat) throw AppError.badRequest("Seat not found");
  if (seat.status === "MAINTENANCE") {
    throw AppError.badRequest("Seat is currently under maintenance");
  }

  const shift = await repo.findShiftById(request.shiftId);
  if (!shift) throw AppError.badRequest("Shift not found");

  const conflict = await repo.findActiveBookingBySeatShiftAndDate(
    request.seatId,
    request.shiftId,
    request.bookingDate
  );
  if (conflict) {
    throw AppError.badRequest("Seat is already booked for this shift and date");
  }

  const userBookings = await repo.findActiveBookingsForUserOnDate(userId, request.bookingDate);
  if (userBookings.some((b) => Number(b.shift_id) === request.shiftId)) {
    throw AppError.badRequest("You already have a booking for this shift on this date");
  }

  const row = await repo.insertBooking(
    userId,
    request.seatId,
    request.shiftId,
    Number(activeSub.id),
    request.bookingDate
  );
  return loadBookingJson(row);
}

export async function cancelBooking(bookingId: number, userId: number) {
  const booking = await repo.findBookingById(bookingId);
  if (!booking) throw AppError.badRequest("Booking not found");
  if (Number(booking.user_id) !== userId) {
    throw AppError.forbidden("Unauthorized action");
  }
  const row = await repo.cancelBooking(bookingId);
  return loadBookingJson(row);
}

export async function validateSeatForAssignment(
  seatId: number,
  excludeUserId: number | null,
  planId?: number | null,
  shiftId?: number | null
) {
  const seat = await repo.findSeatById(seatId);
  if (!seat) throw AppError.badRequest(`Seat not found: ${seatId}`);
  if (seat.status === "MAINTENANCE") throw AppError.badRequest("Seat is under maintenance");
  const targetShift =
    shiftId != null
      ? await resolveTargetShift(shiftId, null)
      : await resolveTargetShift(null, planId ?? null);
  if (await isSeatBlockedForShift(seatId, targetShift, excludeUserId)) {
    throw AppError.badRequest(`Seat ${seat.seat_number} is not available for this shift`);
  }
}

export async function bulkSetCapacity(total: number) {
  if (total < 1) throw AppError.badRequest("Capacity must be at least 1");

  await SimpleDatabase.withTransaction(async (client: PoolClient) => {
    const seatsRes = await client.query(`SELECT ${repo.SEAT_COLUMNS} FROM seats ORDER BY id`);
    const seats = seatsRes.rows;
    const currentCount = seats.length;

    if (currentCount < total) {
      let maxNum = 0;
      for (const s of seats) {
        const numPart = String(s.seat_number).replace(/[^0-9]/g, "");
        if (numPart) {
          const num = parseInt(numPart, 10);
          if (num > maxNum) maxNum = num;
        }
      }
      for (let i = currentCount + 1; i <= total; i++) {
        maxNum++;
        const seatNumber = `Seat-${String(maxNum).padStart(2, "0")}`;
        await client.query(
          `INSERT INTO seats (seat_number, status, has_power_outlet) VALUES ($1, 'AVAILABLE', true)`,
          [seatNumber]
        );
      }
    } else if (currentCount > total) {
      const sorted = [...seats].sort((a, b) => {
        try {
          const n1 = parseInt(String(a.seat_number).replace(/[^0-9]/g, ""), 10);
          const n2 = parseInt(String(b.seat_number).replace(/[^0-9]/g, ""), 10);
          return n2 - n1;
        } catch {
          return String(b.seat_number).localeCompare(String(a.seat_number));
        }
      });

      const toRemove = currentCount - total;
      for (let i = 0; i < toRemove; i++) {
        const seat = sorted[i];
        const assigned = await client.query(`SELECT 1 FROM users WHERE assigned_seat_id = $1 LIMIT 1`, [seat.id]);
        const booked = await client.query(`SELECT 1 FROM bookings WHERE seat_id = $1 LIMIT 1`, [seat.id]);
        if (assigned.rows.length > 0 || booked.rows.length > 0) {
          throw AppError.badRequest(
            `Cannot reduce seat capacity because ${seat.seat_number} is currently assigned to a user or has booking history.`
          );
        }
        await client.query(`DELETE FROM seats WHERE id = $1`, [seat.id]);
      }
    }
  });
}

/** Used by attendance module for "today's" booking lookup. */
export function todayDate(): string {
  return istToday();
}

export { repo };
