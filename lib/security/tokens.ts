import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { getSecurityEnv } from "@/lib/env";

export type TokenVault = {
  generate(): string;
  hash(token: string): string;
  hashIp(ip: string): string;
  encrypt(token: string): string;
  decrypt(ciphertext: string): string;
};

export function createTokenVault({
  encryptionKey,
  pepper,
}: {
  encryptionKey: Buffer;
  pepper: string;
}): TokenVault {
  if (encryptionKey.byteLength !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes");
  }

  const digest = (namespace: string, value: string) =>
    createHash("sha256").update(`${namespace}:${pepper}:${value}`, "utf8").digest("hex");

  return {
    generate: () => randomBytes(32).toString("base64url"),
    hash: (token) => digest("token", token),
    hashIp: (ip) => digest("ip", ip),
    encrypt: (token) => {
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
      const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
      return [iv, cipher.getAuthTag(), encrypted]
        .map((part) => part.toString("base64url"))
        .join(".");
    },
    decrypt: (ciphertext) => {
      const parts = ciphertext.split(".");
      if (parts.length !== 3) throw new Error("Invalid encrypted token");
      const [ivValue, tagValue, encryptedValue] = parts as [string, string, string];
      const decipher = createDecipheriv(
        "aes-256-gcm",
        encryptionKey,
        Buffer.from(ivValue, "base64url"),
      );
      decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
      return Buffer.concat([
        decipher.update(Buffer.from(encryptedValue, "base64url")),
        decipher.final(),
      ]).toString("utf8");
    },
  };
}

let productionVault: TokenVault | undefined;

export function getTokenVault(): TokenVault {
  if (!productionVault) {
    const env = getSecurityEnv();
    productionVault = createTokenVault({
      encryptionKey: Buffer.from(env.TOKEN_ENCRYPTION_KEY, "base64"),
      pepper: env.TOKEN_HASH_PEPPER,
    });
  }
  return productionVault;
}
