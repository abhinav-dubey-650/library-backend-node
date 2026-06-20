import { SimpleDatabase } from "../../core/database/SimpleDatabase";
import { istToday } from "../../shared/ist";
import { SCOPE_KEY } from "./whatsapp.config";
import * as wa from "./whatsapp.service";

export async function getDashboardData(
  page: number,
  pageSize: number,
  search?: string | null,
  status?: string | null,
  templateName?: string | null
) {
  const scope = SCOPE_KEY;
  const safePage = Math.max(page, 1);
  const safeSize = Math.min(Math.max(pageSize, 1), 100);
  const offset = (safePage - 1) * safeSize;

  const conditions = [`wm.org_id = $1`];
  const params: unknown[] = [scope];
  let idx = 2;

  if (search && search.trim()) {
    conditions.push(
      `(u.full_name ILIKE $${idx} OR u.member_id ILIKE $${idx} OR wm.recipient_phone ILIKE $${idx} OR wm.recipient_name ILIKE $${idx})`
    );
    params.push(`%${search.trim()}%`);
    idx++;
  }
  if (status && status.trim()) {
    conditions.push(`wm.message_status = $${idx++}`);
    params.push(status.trim().toLowerCase());
  }
  if (templateName && templateName.trim()) {
    conditions.push(`wm.template_name = $${idx++}`);
    params.push(templateName.trim());
  }

  const where = conditions.join(" AND ");
  const countRes = await SimpleDatabase.query(
    `SELECT COUNT(*)::bigint AS total FROM whatsapp_messages wm
     LEFT JOIN users u ON wm.student_id = u.id WHERE ${where}`,
    params
  );
  const totalCount = Number(countRes.rows[0]?.total ?? 0);

  const listRes = await SimpleDatabase.query(
    `SELECT wm.id, wm.message_id, wm.recipient_phone, wm.template_name, wm.message_status,
            wm.failure_reason, wm.sent_at, wm.delivered_at, wm.read_at, wm.student_id, wm.variables,
            u.full_name AS member_name, u.member_id AS member_member_id
     FROM whatsapp_messages wm
     LEFT JOIN users u ON wm.student_id = u.id
     WHERE ${where}
     ORDER BY wm.sent_at DESC NULLS LAST, wm.id DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, safeSize, offset]
  );

  const messages = listRes.rows.map((row) => ({
    id: Number(row.id),
    messageId: row.message_id ?? null,
    recipientPhone: row.recipient_phone,
    templateName: row.template_name,
    status: row.message_status,
    errorMessage: row.failure_reason ?? null,
    sentAt: row.sent_at ? new Date(row.sent_at).toISOString() : null,
    deliveredAt: row.delivered_at ? new Date(row.delivered_at).toISOString() : null,
    readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
    memberId: row.student_id != null ? Number(row.student_id) : null,
    memberName: row.member_name ?? null,
    memberMemberId: row.member_member_id ?? null,
  }));

  const todayIst = istToday();
  const statsRes = await SimpleDatabase.query(
    `SELECT
       COUNT(*)::bigint AS total,
       COUNT(CASE WHEN message_status IN ('sent', 'delivered', 'read') THEN 1 END)::bigint AS combined_success,
       COUNT(CASE WHEN message_status = 'sent' THEN 1 END)::bigint AS sent,
       COUNT(CASE WHEN message_status = 'delivered' THEN 1 END)::bigint AS delivered,
       COUNT(CASE WHEN message_status = 'read' THEN 1 END)::bigint AS read,
       COUNT(CASE WHEN message_status = 'failed' THEN 1 END)::bigint AS failed,
       COUNT(CASE WHEN (sent_at AT TIME ZONE 'Asia/Kolkata')::date = $2::date THEN 1 END)::bigint AS today_messages
     FROM whatsapp_messages WHERE org_id = $1`,
    [scope, todayIst]
  );
  const queueRes = await SimpleDatabase.query(
    `SELECT
       COUNT(CASE WHEN status = 'pending' THEN 1 END)::bigint AS pending,
       COUNT(CASE WHEN status = 'failed' THEN 1 END)::bigint AS failed
     FROM whatsapp_message_queue WHERE org_id = $1`,
    [scope]
  );

  const s = statsRes.rows[0];
  const q = queueRes.rows[0];
  const total = Number(s.total);
  const successful = Number(s.combined_success);
  const successRate = total > 0 ? Math.round((successful * 100) / total) : 0;

  const stats = {
    total,
    successful,
    sent: Number(s.sent),
    delivered: Number(s.delivered),
    read: Number(s.read),
    failed: Number(s.failed),
    todayMessages: Number(s.today_messages),
    successRate,
    queuePending: Number(q.pending),
    queueFailed: Number(q.failed),
  };

  const totalPages = safeSize > 0 ? Math.ceil(totalCount / safeSize) : 0;
  return {
    messages,
    stats,
    pagination: { page: safePage, pageSize: safeSize, total: totalCount, totalPages },
  };
}

export async function retryFailedMessage(messageDbId: number) {
  const scope = SCOPE_KEY;
  const res = await SimpleDatabase.query(
    `SELECT wm.*, u.full_name AS member_name
     FROM whatsapp_messages wm
     LEFT JOIN users u ON wm.student_id = u.id
     WHERE wm.id = $1 AND wm.org_id = $2 AND wm.message_status = 'failed'`,
    [messageDbId, scope]
  );
  if (res.rows.length === 0) throw new Error("Failed message not found");

  const row = res.rows[0];
  let variables: Record<string, unknown> =
    typeof row.variables === "string" ? JSON.parse(row.variables) : row.variables ?? {};
  if (Object.keys(variables).length === 0 && row.template_name === wa.TEMPLATE_NAME) {
    const name = row.member_name ?? row.recipient_name ?? "Member";
    variables = { "1": String(name).trim() };
  }

  await wa.retryExistingMessage(
    messageDbId,
    String(row.recipient_phone),
    String(row.template_name),
    row.template_language ? String(row.template_language) : wa.TEMPLATE_LANGUAGE,
    variables,
    scope,
    row.student_id != null ? Number(row.student_id) : null
  );
}
