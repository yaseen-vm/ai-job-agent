import { SignJWT, jwtVerify } from 'jose';

const ALG = 'HS256';
const EXPIRY = '7d';

function getKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signToken(userId: string, secret: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getKey(secret));
}

export async function verifyToken(token: string, secret: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getKey(secret));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
