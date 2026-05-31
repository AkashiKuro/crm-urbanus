// Autenticacao sem dependencias externas (funciona na Vercel/serverless).
// - Senha: scrypt com salt aleatorio  (formato salt:hash em hex)
// - Token: JWT-like assinado com HMAC-SHA256 (header.payload.assinatura, base64url)

import {
  scryptSync,
  randomBytes,
  timingSafeEqual,
  createHmac,
} from "node:crypto";

const SECRET =
  process.env.AUTH_SECRET ||
  process.env.JWT_SECRET ||
  "urbanus-crm-dev-secret-troque-em-producao";

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dias

/* ----------------------- senha ----------------------- */

export function hashPassword(plain) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(String(plain), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(plain, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const test = scryptSync(String(plain), salt, 64);
  const ref = Buffer.from(hash, "hex");
  return test.length === ref.length && timingSafeEqual(test, ref);
}

/* ----------------------- token ----------------------- */

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlJson(obj) {
  return b64url(JSON.stringify(obj));
}

function sign(data) {
  return b64url(createHmac("sha256", SECRET).update(data).digest());
}

export function signToken(user) {
  const header = b64urlJson({ alg: "HS256", typ: "JWT" });
  const payload = b64urlJson({
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  });
  const sig = sign(`${header}.${payload}`);
  return `${header}.${payload}.${sig}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  if (sign(`${header}.${payload}`) !== sig) return null;
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
  } catch {
    return null;
  }
  if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
  return data; // { id, role, name, email, exp }
}

// Extrai o usuario do header Authorization: Bearer <token>
export function getAuthUser(req) {
  const header =
    (req.headers && (req.headers.authorization || req.headers.Authorization)) ||
    "";
  const m = /^Bearer\s+(.+)$/i.exec(header);
  if (!m) return null;
  return verifyToken(m[1]);
}
