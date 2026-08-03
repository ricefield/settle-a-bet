import { createTokenVault } from "./tokens";

describe("TokenVault", () => {
  const vault = createTokenVault({
    encryptionKey: Buffer.alloc(32, 7),
    pepper: "test-pepper-at-least-sixteen",
  });

  it("round-trips encrypted invitation tokens", () => {
    const token = vault.generate();
    expect(vault.decrypt(vault.encrypt(token))).toBe(token);
  });

  it("uses separate stable namespaces for tokens and IPs", () => {
    expect(vault.hash("same")).toBe(vault.hash("same"));
    expect(vault.hashIp("same")).not.toBe(vault.hash("same"));
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = vault.encrypt("secret");
    const replacement = encrypted.at(-1) === "A" ? "B" : "A";
    expect(() => vault.decrypt(`${encrypted.slice(0, -1)}${replacement}`)).toThrow();
  });
});
