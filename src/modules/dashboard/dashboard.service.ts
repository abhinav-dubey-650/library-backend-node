import { SimpleDatabase } from "../../core/database/SimpleDatabase";
import { istYear, istMonth } from "../../shared/ist";
import * as feeSvc from "../fees/fees.service";

export async function getAdminDashboard() {
  const year = istYear();
  const month = istMonth();

  const [members, activeMembers, checkedIn, seats, fees, libraryNameRow] = await Promise.all([
    SimpleDatabase.query(`SELECT COUNT(*)::bigint AS cnt FROM users WHERE role = 'MEMBER'`, []),
    SimpleDatabase.query(`SELECT COUNT(*)::bigint AS cnt FROM users WHERE role = 'MEMBER' AND is_active = true`, []),
    SimpleDatabase.query(`SELECT COUNT(*)::bigint AS cnt FROM attendance WHERE check_out_time IS NULL`, []),
    SimpleDatabase.query(`SELECT id, status FROM seats`, []),
    feeSvc.getStats(year, month),
    SimpleDatabase.query(`SELECT config_value FROM library_config WHERE config_key = 'library_name' LIMIT 1`, []),
  ]);

  const seatRows = seats.rows;
  const available = seatRows.filter((s) => s.status === "AVAILABLE").length;

  return {
    totalMembers: Number(members.rows[0]?.cnt ?? 0),
    activeMembers: Number(activeMembers.rows[0]?.cnt ?? 0),
    checkedInNow: Number(checkedIn.rows[0]?.cnt ?? 0),
    totalSeats: seatRows.length,
    availableSeats: available,
    feesOutstanding: fees.totalOutstanding,
    feesOutstandingCount: fees.outstandingCount,
    feesCollected: fees.totalCollected,
    feesOverdueCount: fees.overdueCount,
    libraryName: libraryNameRow.rows[0]?.config_value ?? "Library",
  };
}
