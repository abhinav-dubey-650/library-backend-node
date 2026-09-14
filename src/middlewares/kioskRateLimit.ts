import rateLimit from "express-rate-limit";

/** Reads: generous because a shared library-WiFi IP may have many phones polling /scan every ~30s. */
export const kioskReadLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again shortly." },
});

/** Writes (punch in/out): stops scripted spam even when a valid key is leaked. */
export const kioskWriteLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
});