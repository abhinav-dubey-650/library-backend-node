import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { authenticate } from "../../middlewares/authMiddleware";
import { requireAdminOrLibrarian } from "../../middlewares/requireRole";
import { AppError } from "../../core/errors/AppError";
import * as c from "./student-ocr.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype?.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

// Wrap multer so its errors (bad file type, oversized upload) become clean 400s
// instead of a generic 500.
const uploadImage = (req: Request, res: Response, next: NextFunction): void => {
  upload.single("image")(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : "Invalid upload";
      return next(AppError.badRequest(message));
    }
    next();
  });
};

export const studentOcrRouter = Router();

// POST /api/students/ocr — admin/librarian scans an admission form; the vision
// model auto-fills name / phone / dob / address.
studentOcrRouter.post("/", authenticate, requireAdminOrLibrarian, uploadImage, c.extract);