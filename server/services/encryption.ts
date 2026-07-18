import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type EncryptedEnvelope = {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: string;
};

export interface CredentialEncryptionService {
  encrypt(plaintext: string): EncryptedEnvelope;
  decrypt(envelope: EncryptedEnvelope): string;
}

export class AesGcmCredentialEncryptionService implements CredentialEncryptionService {
  constructor(
    private readonly key: Buffer,
    private readonly keyVersion = "env-v1",
  ) {
    if (key.length !== 32)
      throw new Error("Credential encryption key must be exactly 32 bytes");
  }

  encrypt(plaintext: string): EncryptedEnvelope {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    return {
      ciphertext: ciphertext.toString("base64"),
      iv: iv.toString("base64"),
      authTag: cipher.getAuthTag().toString("base64"),
      keyVersion: this.keyVersion,
    };
  }

  decrypt(envelope: EncryptedEnvelope): string {
    if (envelope.keyVersion !== this.keyVersion)
      throw new Error("Credential key version is unavailable");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.key,
      Buffer.from(envelope.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(envelope.authTag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
  }
}
