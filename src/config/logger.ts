import pino from "pino";

const redactPaths = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers['x-admin-pin']",
  "password",
  "passwordHash",
  "token",
];

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: { paths: redactPaths, remove: true },
});
