import { createHandler } from "../../core/http/createHandler";
import { AppError } from "../../core/errors/AppError";
import { extractStudentFields } from "./student-ocr.service";

// No admin PIN here — same auth level as POST /auth/students/register
// (authenticate + requireAdminOrLibrarian at the route).
export const extract = createHandler(async (req, res) => {
  const file = (req as unknown as { file?: { buffer: Buffer; originalname?: string; mimetype?: string } }).file;
  if (!file) throw AppError.badRequest("An image is required");

  const fields = await extractStudentFields({
    buffer: file.buffer,
    filename: file.originalname || "student-form.jpg",
    mimetype: file.mimetype || "image/jpeg",
  });

  res.status(200).json(fields);
});