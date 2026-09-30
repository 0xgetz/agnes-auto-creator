/**
 * Random data generators for account provisioning.
 * All identifiers are cryptographically random (node:crypto).
 *
 * @module utils/random
 */

import { randomInt } from "node:crypto";

/** Pick a random element from an array. */
export function pick(arr) {
  return arr[randomInt(arr.length)];
}

/** Random integer in [0, max). */
export function randInt(max) {
  return randomInt(max);
}

/** Shuffle a string's characters. */
function shuffle(str) {
  const a = str.split("");
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.join("");
}

const FIRST = [
  "Adam", "Ariel", "Budi", "Cahya", "Dewi", "Eka", "Fajar", "Gita", "Hana",
  "Indra", "Joko", "Kirana", "Laras", "Maya", "Nadia", "Oka", "Putri", "Rani",
  "Sari", "Tirta", "Umar", "Vina", "Wulan", "Yudi", "Zahra", "Bima", "Citra",
  "Damar", "Elang", "Farah", "Aisha", "Rizky", "Sinta", "Bayu", "Mega",
];

const LAST = [
  "Pratama", "Santoso", "Wijaya", "Kusuma", "Nugroho", "Hidayat", "Setiawan",
  "Maulana", "Permana", "Saputra", "Halim", "Ramadhan", "Firmansyah",
  "Anggraini", "Puspita", "Maharani", "Kurniawan", "Susanto", "Gunawan",
  "Siregar", "Hartono", "Purnama", "Lestari", "Wibowo",
];

const EMAIL_A = [
  "swift", "calm", "bright", "north", "lunar", "ember", "quiet", "vivid",
  "amber", "solar", "frost", "river", "delta", "noble", "crisp", "zesty",
  "misty", "brave", "silent", "rapid", "azure", "coral", "jade", "onyx",
];

const EMAIL_B = [
  "fox", "lynx", "orbit", "pixel", "cedar", "comet", "harbor", "falcon",
  "willow", "quartz", "raven", "maple", "otter", "badger", "heron", "finch",
  "koala", "puma", "wren", "bison", "wolf", "hawk", "kite", "moth",
];

const KEY_ADJ = [
  "prod", "dev", "test", "main", "alpha", "beta", "edge", "core", "data",
  "web", "app", "cli", "ml", "ops", "tool", "lab", "staging", "nightly",
];

const KEY_NOUN = [
  "key", "token", "access", "secret", "agent", "bot", "script", "worker",
  "bridge", "gateway", "runner", "client",
];

/** A human-looking random full name, e.g. "Putri Maharani". */
export function randomName() {
  return `${pick(FIRST)} ${pick(LAST)}`;
}

/** A random email local-part, e.g. "swiftfox482913". */
export function randomEmailLocal() {
  return `${pick(EMAIL_A)}${pick(EMAIL_B)}${randInt(900000) + 100000}`;
}

/**
 * A strong random password guaranteed to contain lower, upper, digit and
 * symbol characters.
 * @param {number} [len=16]
 */
export function randomPassword(len = 16) {
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digit = "23456789";
  const sym = "!@#$%^&*";
  const all = lower + upper + digit + sym;
  let s = pick(lower) + pick(upper) + pick(digit) + pick(sym);
  for (let i = s.length; i < len; i++) s += all[randInt(all.length)];
  return shuffle(s);
}

/** A random API-key name, e.g. "prod-token-7421". */
export function randomKeyName() {
  return `${pick(KEY_ADJ)}-${pick(KEY_NOUN)}-${randInt(9000) + 1000}`;
}
