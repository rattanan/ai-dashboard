import { describe, expect, it } from "vitest";
import { AesGcmCredentialEncryptionService } from "@/server/services/encryption";

describe("credential encryption", () => {
  const service = new AesGcmCredentialEncryptionService(Buffer.alloc(32, 7));
  it("round trips without storing plaintext", () => {
    const encrypted = service.encrypt("sensitive-password");
    expect(encrypted.ciphertext).not.toContain("sensitive-password");
    expect(service.decrypt(encrypted)).toBe("sensitive-password");
  });
  it("detects ciphertext tampering", () => {
    const encrypted = service.encrypt("sensitive-password");
    expect(() =>
      service.decrypt({
        ...encrypted,
        ciphertext: Buffer.alloc(16).toString("base64"),
      }),
    ).toThrow();
  });
  it("rejects invalid key lengths", () => {
    expect(
      () => new AesGcmCredentialEncryptionService(Buffer.alloc(16)),
    ).toThrow(/32 bytes/);
  });
});
