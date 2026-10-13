#!/usr/bin/env node
// Offline preflight. Checks presence/shape only; does NOT validate provider access.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";

const filename = process.argv[2] && !process.argv[2].startsWith("--")
  ? process.argv[2] : ".env.production";
const withCompose = process.argv.includes("--compose");
let vars;
try {
  vars = dotenv.parse(readFileSync(resolve(filename), "utf8"));
} catch {
  console.error("No se pudo leer el archivo solicitado. Copia .env.production.example a .env.production.");
  process.exit(2);
}
const issues = [];
const placeholder = /REEMPLAZAR|PLACEHOLDER|CHANGE_ME|YOUR_|TU_DOMINIO|tu-dominio|example\.com|example\.org/i;
function required(key) {
  const value = (vars[key] ?? "").trim();
  if (!value || placeholder.test(value)) {
    issues.push(key + ": falta configurar un valor real");
    return "";
  }
  return value;
}
function httpsUrl(key) {
  const value = required(key);
  if (!value) return;
  try {
    if (new URL(value).protocol !== "https:") issues.push(key + ": debe usar HTTPS");
  } catch {
    issues.push(key + ": URL no valida");
  }
}
function endpointUrl(key) {
  const value = (vars[key] ?? "").trim();
  if (!value) return;
  try {
    if (new URL(value).protocol !== "https:") issues.push(key + ": debe usar HTTPS");
  } catch {
    issues.push(key + ": URL no valida");
  }
}
if (required("NODE_ENV") !== "production") issues.push("NODE_ENV: usar production para este chequeo");
httpsUrl("NEXT_PUBLIC_APP_URL");
const authSecret = required("AUTH_SECRET");
if (authSecret && authSecret.length < 32) issues.push("AUTH_SECRET: minimo 32 caracteres");
const db = required("DATABASE_URL");
if (db) {
  try {
    const parsed = new URL(db);
    if (!["postgresql:", "postgres:"].includes(parsed.protocol) ||
        !parsed.hostname || !parsed.username || !parsed.password) {
      issues.push("DATABASE_URL: se requiere URL PostgreSQL con usuario y contrasena");
    }
  } catch {
    issues.push("DATABASE_URL: URL no valida");
  }
}
if (withCompose) {
  for (const key of ["POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB", "REDIS_PASSWORD"]) {
    required(key);
  }
}
const redisUrl = (vars.REDIS_URL ?? "").trim();
if (redisUrl) {
  try {
    const parsed = new URL(redisUrl);
    if (!["redis:", "rediss:"].includes(parsed.protocol) || !parsed.hostname ||
        (!parsed.password && !(vars.REDIS_PASSWORD ?? "").trim())) {
      issues.push("REDIS_URL: indicar protocolo redis(s), host y contrasena");
    }
  } catch {
    issues.push("REDIS_URL: URL no valida");
  }
} else {
  required("REDIS_HOST");
  required("REDIS_PORT");
  required("REDIS_PASSWORD");
}
const wompiMode = required("WOMPI_ENVIRONMENT");
if (!["sandbox", "production"].includes(wompiMode)) issues.push("WOMPI_ENVIRONMENT: sandbox o production");
for (const key of ["WOMPI_PUBLIC_KEY", "WOMPI_PRIVATE_KEY", "WOMPI_INTEGRITY_SECRET", "WOMPI_EVENTS_SECRET"]) {
  required(key);
}
if (required("MEDIA_STORAGE_PROVIDER") !== "s3") {
  issues.push("MEDIA_STORAGE_PROVIDER: debe ser s3 para persistencia en produccion");
}
for (const key of ["MEDIA_STORAGE_BUCKET", "MEDIA_STORAGE_REGION",
  "MEDIA_STORAGE_ACCESS_KEY_ID", "MEDIA_STORAGE_SECRET_ACCESS_KEY"]) required(key);
if (vars.MEDIA_STORAGE_REGION === "auto") required("MEDIA_STORAGE_ENDPOINT");
endpointUrl("MEDIA_STORAGE_ENDPOINT");
httpsUrl("MEDIA_PUBLIC_CDN_URL");
if (vars.NOTIFICATION_DELIVERY_ENABLED === "true") {
  const resend = (vars.RESEND_API_KEY ?? "").trim() && (vars.RESEND_FROM_EMAIL ?? "").trim();
  const twilio = (vars.TWILIO_ACCOUNT_SID ?? "").trim() &&
    (vars.TWILIO_API_KEY_SID ?? "").trim() &&
    (vars.TWILIO_API_KEY_SECRET ?? "").trim() &&
    ((vars.TWILIO_SMS_FROM ?? "").trim() || (vars.TWILIO_WHATSAPP_FROM ?? "").trim());
  if (!resend && !twilio) issues.push("NOTIFICATION_DELIVERY_ENABLED: configura Resend o Twilio");
}
console.log("Chequeo offline de variables:", filename);
const uniqueIssues = [...new Set(issues)];
console.log("Campos invalidos o pendientes:", uniqueIssues.length);
for (const issue of uniqueIssues) console.error(" - " + issue);
if (wompiMode === "production") {
  console.warn("ATENCION: modo de pagos reales. Esta comprobacion NO verifica webhooks, cobros ni autorizacion de lanzamiento.");
}
if (!uniqueIssues.length) {
  console.log("Formato y campos: OK. No se han probado conexiones ni credenciales externas.");
}
process.exitCode = uniqueIssues.length ? 1 : 0;
