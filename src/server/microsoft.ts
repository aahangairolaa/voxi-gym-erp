/**
 * "Continue with Microsoft" (Outlook, Hotmail, Office 365 / work accounts), no extra packages.
 * Turn it on by setting MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET
 * (portal.azure.com → Microsoft Entra ID → App registrations → New registration,
 *  "Accounts in any organizational directory and personal Microsoft accounts")
 * and adding this Web redirect URI:  https://<your-domain>/api/auth/microsoft/callback
 */
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { GoogleProfile } from "./google";

const JWKS = createRemoteJWKSet(new URL("https://login.microsoftonline.com/common/discovery/v2.0/keys"));
/** The tenant every personal Microsoft account (Outlook, Hotmail, Live) belongs to. */
const CONSUMER_TENANT = "9188040d-6c67-4c5b-b112-36a304b66dad";

export const MS_OAUTH_COOKIE = "voxi_ms_oauth";
export const microsoftRedirectUri = (origin: string) => `${origin}/api/auth/microsoft/callback`;

export function microsoftEnabled() {
  return !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
}

export function microsoftAuthUrl(origin: string, state: string) {
  const u = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  u.searchParams.set("client_id", process.env.MICROSOFT_CLIENT_ID!);
  u.searchParams.set("redirect_uri", microsoftRedirectUri(origin));
  u.searchParams.set("response_type", "code");
  u.searchParams.set("response_mode", "query");
  u.searchParams.set("scope", "openid email profile");
  u.searchParams.set("state", state);
  u.searchParams.set("prompt", "select_account");
  return u.toString();
}

/** Swap the one-time code for Microsoft's signed ID token and verify it. */
export async function exchangeMicrosoftCode(code: string, origin: string): Promise<GoogleProfile> {
  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      redirect_uri: microsoftRedirectUri(origin),
      grant_type: "authorization_code",
      scope: "openid email profile",
    }),
  });
  const json = (await res.json().catch(() => ({}))) as { id_token?: string };
  if (!res.ok || !json.id_token) throw new Error("Microsoft sign-in failed");
  const { payload } = await jwtVerify(json.id_token, JWKS, { audience: process.env.MICROSOFT_CLIENT_ID! });
  const tid = String(payload.tid ?? "");
  // Each tenant signs with its own issuer URL; it must match the tenant in the token
  if (!tid || payload.iss !== `https://login.microsoftonline.com/${tid}/v2.0`) throw new Error("Unexpected token issuer");
  // Personal accounts: the email is the account itself. Work accounts: use the sign-in name,
  // which must be on a domain the organisation has verified (the "email" claim isn't checked).
  const raw = tid === CONSUMER_TENANT ? (payload.email ?? payload.preferred_username) : payload.preferred_username;
  const email = String(raw ?? "").toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Your Microsoft account has no email address");
  return { sub: String(payload.sub), email, name: String(payload.name ?? email), provider: "microsoft" };
}
