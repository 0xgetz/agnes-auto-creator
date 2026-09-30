/**
 * Minimal structured logger with levels and optional ANSI colour.
 * No dependencies.
 *
 * @module utils/logger
 */

const C = {
  reset: "\x1b[0m",
  gray: "\x1b[90m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (c, s) => (useColor ? `${c}${s}${C.reset}` : s);

/** ISO timestamp without the milliseconds noise. */
function ts() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function emit(level, color, tag, msg) {
  const line = `${paint(C.gray, ts())} ${paint(color, tag.padEnd(5))} ${msg}`;
  process.stdout.write(line + "\n");
}

export const log = {
  info: (m) => emit("info", C.cyan, "INFO", m),
  step: (m) => emit("step", C.blue, "STEP", m),
  ok: (m) => emit("ok", C.green, "OK", m),
  warn: (m) => emit("warn", C.yellow, "WARN", m),
  error: (m) => emit("error", C.red, "ERR", m),
  raw: (m) => process.stdout.write(m + "\n"),
};

export const color = {
  dim: (s) => paint(C.gray, s),
  bold: (s) => paint(C.bold, s),
  green: (s) => paint(C.green, s),
  cyan: (s) => paint(C.cyan, s),
  yellow: (s) => paint(C.yellow, s),
  red: (s) => paint(C.red, s),
};
