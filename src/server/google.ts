/**
 * "Continue with Google" (OAuth 2.0 / OpenID Connect), no extra packages.
 * Turn it on by setting GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
 * (Google Cloud Console → APIs & Services → Credentials → OAuth client ID → Web application)
 * and adding this Authorized redirect URI:  https://<your-domain>/api/auth/google/callback
 */
import { SignJWT, createRemoteJWKSet, jwtVerify } from "jose";

const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
export const OAUTH_COOKIE = "voxi_oauth";
export const GOOGLE_SIGNUP_COOKIE = "voxi_google_signup";

export function appOrigin(reqOrigin: string) {
  return (process.env.APP_URL || reqOrigin).replace(/\/$/, "");
}
export const redirectUri = (origin: string) => `${origin}/api/auth/google/callback`;

export function googleAuthUrl(origin: string, state: string) {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  u.searchParams.set("redirect_uri", redirectUri(origin));
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "openid email profile");
  u.searchParams.set("state", state);
  u.searchParams.set("prompt", "select_account");
  return u.toString();
}

/** An account from Google or Microsoft, waiting to sign in or finish signing up. */
export type GoogleProfile = { sub: string; email: string; name: string; provider?: "google" | "microsoft" };

/** Swap the one-time code for Google's signed ID token and verify it. */
export async function exchangeCode(code: string, origin: string): Promise<GoogleProfile> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
    }),
  });
  const json = (await res.json().catch(() => ({}))) as { id_token?: string };
  if (!res.ok || !json.id_token) throw new Error("Google sign-in failed");
  const { payload } = await jwtVerify(json.id_token, JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: process.env.GOOGLE_CLIENT_ID!,
  });
  if (!payload.email || payload.email_verified !== true) throw new Error("Your Google email isn't verified");
  return { sub: String(payload.sub), email: String(payload.email).toLowerCase(), name: String(payload.name ?? payload.email), provider: "google" };
}

function key() {
  return new TextEncoder().encode(`${process.env.AUTH_SECRET ?? "voxi-dev-only-secret-change-me-please"}:google-signup`);
}
/** A short-lived, signed note "this Google account wants to sign up", kept until the form is finished. */
export async function signSignup(p: GoogleProfile) {
  return new SignJWT({ ...p }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("20m").sign(key());
}
export async function readSignup(token: string | undefined): Promise<GoogleProfile | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return { sub: String(payload.sub), email: String(payload.email), name: String(payload.name), provider: payload.provider === "microsoft" ? "microsoft" : "google" };
  } catch {
    return null;
  }
}
