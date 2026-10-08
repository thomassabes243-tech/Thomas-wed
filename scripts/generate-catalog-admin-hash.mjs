import { randomBytes, scryptSync } from "node:crypto";
import { readFileSync } from "node:fs";

// The password is read ONLY from stdin, never from command-line arguments.
// Example from a shell: read -rsp 'Clave: ' PASS; printf %s "$PASS" | node scripts/generate-catalog-admin-hash.mjs; unset PASS
if (process.stdin.isTTY) {
  console.error("Por seguridad, envíe la contraseña por stdin desde una lectura sin eco (read -rsp).");
  process.exit(1);
}
const password = readFileSync(0, "utf8").replace(/\r?\n$/, "");
if (password.length < 12) {
  console.error("Se requieren al menos 12 caracteres para la contraseña del operador.");
  process.exit(1);
}
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
console.log("scrypt$" + salt.toString("hex") + "$" + hash.toString("hex"));
