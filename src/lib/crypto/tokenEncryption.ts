import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

/**
 * AES-256-GCM for oauth_tokens.enc_access_token/enc_refresh_token
 * (v16: "enc_*" columns, bytea, NEVER plaintext, NEVER selected by the
 * app role"). This is the app-layer encryption named as an acceptable
 * alternative to Supabase Vault in the v16 catalog notes.
 *
 * Format stored in the bytea column: iv (12 bytes) || authTag (16 bytes)
 * || ciphertext — one buffer, self-describing length via fixed-size
 * prefixes, so decrypt() needs nothing but the buffer and the key.
 *
 * Key management: TOKEN_ENCRYPTION_KEY must be a 32-byte key, base64-
 * encoded, in env. Rotation isn't implemented here — v16's
 * oauth_tokens.key_version column exists for exactly that, and rotation
 * support is real follow-up work, not silently assumed solved by this
 * first version.
 */
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY is not set. Refusing to encrypt/decrypt tokens without it — " +
      "there is no safe fallback for missing encryption key material."
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(`TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes for AES-256; got ${key.length}.`);
  }
  return key;
}

export function encryptToken(plaintext: string): Buffer {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]);
}

export function decryptToken(encrypted: Buffer): string {
  const key = getKey();
  const iv = encrypted.subarray(0, IV_LENGTH);
  const authTag = encrypted.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = encrypted.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
