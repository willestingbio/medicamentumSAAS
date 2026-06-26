import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.VENDOR_BANK_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "VENDOR_BANK_ENCRYPTION_KEY no está configurada. " +
      "Genera una con: openssl rand -base64 32"
    );
  }
  return Buffer.from(raw, "base64");
}

export function encryptBankInfo(data: object): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptBankInfo(packed: string): object {
  const key = getKey();
  const buf = Buffer.from(packed, "base64");
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8"));
}
