import { createHandler } from "../../core/http/createHandler";
import { requirePin } from "../../middlewares/adminPin";
import { AppError } from "../../core/errors/AppError";
import { extractStudentFields } from "./student-ocr.service";

export const extract = createHandler(async (req, res) => {
  requirePin(req.header("X-Admin-Pin"));

  const file = (req as unknown as { file?: { buffer: Buffer; originalname?: string; mimetype?: string } }).file;
  if (!file) throw AppError.badRequest("An image is required");

  const fields = await extractStudentFields({
    buffer: file.buffer,
    filename: file.originalname || "student-form.jpg",
    mimetype: file.mimetype || "image/jpeg",
  });

  res.status(200).json(fields);
});