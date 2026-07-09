import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

/**
 * Symmetric encryption for provider API keys at rest (AES-256-GCM).
 * The key is derived from ENCRYPTION_KEY via scrypt, so any sufficiently long
 * secret works. Ciphertext format: "v1:" + base64(iv | authTag | ciphertext).
 *
 * ENCRYPTION_KEY is server-only and must never be exposed to the client.
 */
const SALT = "wsie-llm-keys-v1"; // fixed salt: rotating it invalidates stored keys
const PREFIX = "v1:";

function deriveKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret || secret.length < 16) {
    throw new Error(
      "ENCRYPTION_KEY is missing or too short (need at least 16 chars)."
    );
  }
  return scryptSync(secret, SALT, 32);
}

export function encryptSecret(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decryptSecret(payload: string): string {
  if (!payload.startsWith(PREFIX)) {
    throw new Error("Unrecognized ciphertext format.");
  }
  const key = deriveKey();
  const raw = Buffer.from(payload.slice(PREFIX.length), "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ct = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
