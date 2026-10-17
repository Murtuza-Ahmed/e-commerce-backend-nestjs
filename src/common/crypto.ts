import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const BCRYPT_ROUNDS = 12;

/** Password hash (signup / reset / admin-create). */
export const hashPassword = (plain: string): Promise<string> =>
  bcrypt.hash(plain, BCRYPT_ROUNDS);

export const comparePassword = (
  plain: string,
  hash: string,
): Promise<boolean> => bcrypt.compare(plain, hash);

export const sha256Hex = (data: string): string =>
  crypto.createHash('sha256').update(data).digest('hex');

/**
 * Refresh tokens DB me hash karke rakho.
 * bcrypt sirf pehle 72 bytes dekhta hai aur do JWTs ke pehle
 * 72 bytes aksar same hote hain (same header + user id) —
 * is liye pehle SHA-256, phir bcrypt. (Real bug, real fix.)
 */
export const hashTokenForStorage = (token: string): Promise<string> =>
  bcrypt.hash(sha256Hex(token), BCRYPT_ROUNDS);

export const verifyTokenHash = (
  token: string,
  hash: string,
): Promise<boolean> => bcrypt.compare(sha256Hex(token), hash);

/** OTP ko plain DB me kabhi mat rakho — HMAC-SHA256. */
export const hmacHex = (secret: string, data: string): string =>
  crypto.createHmac('sha256', secret).update(data).digest('hex');

export const timingSafeEqualHex = (a: string, b: string): boolean => {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

/** 6-digit numeric OTP, crypto-secure. */
export const generateOtpCode = (): string =>
  crypto.randomInt(100_000, 1_000_000).toString();

/** 'murtuza@gmail.com' -> 'm***@gmail.com' (forgot-email response). */
export const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  if (!domain || !local) return '***';
  return `${local[0]}***@${domain}`;
};

export const maskPhone = (phone: string): string =>
  phone.length <= 4 ? '****' : `****${phone.slice(-4)}`;
