// ─── Google JWT Verification ────────────────────────────────────────
// Verifies Google ID tokens using Google's public JWKS keys.
// Runs in Cloudflare Workers (no Node.js crypto needed — uses Web Crypto API).

interface GoogleClaims {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  aud: string;
  iss: string;
  exp: number;
}

interface JWK {
  kty: string;
  kid: string;
  use: string;
  n: string;
  e: string;
  alg: string;
}

interface JWKS {
  keys: JWK[];
}

// Cache Google's public keys
let cachedKeys: JWKS | null = null;
let keysFetchedAt = 0;
const KEYS_TTL = 3600_000; // 1 hour

async function getGooglePublicKeys(): Promise<JWKS> {
  if (cachedKeys && Date.now() - keysFetchedAt < KEYS_TTL) {
    return cachedKeys;
  }

  const res = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  if (!res.ok) throw new Error('Failed to fetch Google public keys');

  cachedKeys = (await res.json()) as JWKS;
  keysFetchedAt = Date.now();
  return cachedKeys;
}

function base64UrlDecode(str: string): Uint8Array {
  // Convert base64url to base64
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importKey(jwk: JWK): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

export async function verifyGoogleToken(
  idToken: string,
  clientId: string
): Promise<GoogleClaims | null> {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;

    const headerStr = new TextDecoder().decode(base64UrlDecode(parts[0]));
    const header = JSON.parse(headerStr) as { kid: string; alg: string };

    if (header.alg !== 'RS256') return null;

    // Get the matching public key
    const jwks = await getGooglePublicKeys();
    const jwk = jwks.keys.find(k => k.kid === header.kid);
    if (!jwk) return null;

    // Verify signature
    const key = await importKey(jwk);
    const signatureBytes = base64UrlDecode(parts[2]);
    const dataBytes = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);

    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      signatureBytes,
      dataBytes
    );
    if (!valid) return null;

    // Decode and validate claims
    const payloadStr = new TextDecoder().decode(base64UrlDecode(parts[1]));
    const claims = JSON.parse(payloadStr) as GoogleClaims;

    // Verify expiry
    if (Date.now() / 1000 > claims.exp) return null;

    // Verify issuer
    if (claims.iss !== 'accounts.google.com' && claims.iss !== 'https://accounts.google.com') {
      return null;
    }

    // Verify audience
    if (claims.aud !== clientId) return null;

    return claims;
  } catch {
    return null;
  }
}
