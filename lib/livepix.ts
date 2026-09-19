/**
 * LivePix client — real OAuth2 + payments API when credentials are set;
 * stub checkout otherwise (demo via /api/payments/stub-confirm).
 *
 * Prefers CONSULTAJAADV-specific env vars, then shared LIVEPIX_* fallbacks.
 *
 * Docs: https://docs.livepix.gg/api/
 * - POST https://oauth.livepix.gg/oauth2/token (client_credentials)
 * - POST https://api.livepix.gg/v2/payments { amount, currency, redirectUrl }
 */

import { isStubPaymentsAllowed } from "@/lib/demo";


const OAUTH_URL = "https://oauth.livepix.gg/oauth2/token";
const PAYMENTS_URL = "https://api.livepix.gg/v2/payments";
const DEFAULT_SCOPE = "payments:write payments:read account:read";

export type LivePixCheckoutInput = {
  amountCents: number;
  description: string;
  externalId: string;
  returnUrl?: string;
};

export type LivePixCheckoutResult = {
  ok: boolean;
  /** Hosted checkout URL (redirectUrl from LivePix or local stub). */
  checkoutUrl?: string;
  /** LivePix reference (or stub ref). */
  providerRef?: string;
  mode?: "live" | "stub";
  error?: string;
};

type TokenCache = { accessToken: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

export function getLivePixEnv() {
  const clientId =
    process.env.LIVEPIX_CLIENT_ID_CONSULTAJAADV?.trim() ||
    process.env.LIVEPIX_CLIENT_ID?.trim() ||
    process.env.LIVEPIX_API_KEY?.trim() ||
    "";
  const clientSecret =
    process.env.LIVEPIX_CLIENT_SECRET_CONSULTAJAADV?.trim() ||
    process.env.LIVEPIX_CLIENT_SECRET?.trim() ||
    "";
  return {
    clientId,
    clientSecret,
    apiKey: "",
    webhookSecret: process.env.LIVEPIX_WEBHOOK_SECRET?.trim() || "",
  };
}

/** True when OAuth client id+secret are present (real API path). */
export function isLivePixConfigured(): boolean {
  const e = getLivePixEnv();
  return Boolean(e.clientId && e.clientSecret);
}

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getLivePixEnv();
  if (!clientId || !clientSecret) {
    throw new Error("LivePix OAuth credentials missing");
  }
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: process.env.LIVEPIX_OAUTH_SCOPE?.trim() || DEFAULT_SCOPE,
  });

  const res = await fetch(OAUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LivePix OAuth failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    access_token: string;
    expires_in?: number;
  };
  tokenCache = {
    accessToken: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return json.access_token;
}

function stubCheckout(input: LivePixCheckoutInput): LivePixCheckoutResult {
  console.info("[livepix stub] createCheckout", input);
  const returnPath = input.returnUrl || "/client/dashboard";
  if (returnPath.startsWith("http")) {
    const url = new URL(returnPath);
    url.searchParams.set("pay", input.externalId);
    return {
      ok: true,
      checkoutUrl: url.toString(),
      providerRef: `stub_${input.externalId}_${Date.now()}`,
      mode: "stub",
    };
  }
  const sep = returnPath.includes("?") ? "&" : "?";
  return {
    ok: true,
    checkoutUrl: `${returnPath}${sep}pay=${encodeURIComponent(input.externalId)}`,
    providerRef: `stub_${input.externalId}_${Date.now()}`,
    mode: "stub",
  };
}

export async function createCheckout(
  input: LivePixCheckoutInput
): Promise<LivePixCheckoutResult> {
  if (!isLivePixConfigured()) {
    if (!isStubPaymentsAllowed()) {
      return {
        ok: false,
        error:
          "LivePix não configurado. Defina LIVEPIX_CLIENT_ID/SECRET (ou DEMO=1 em dev).",
      };
    }
    return stubCheckout(input);
  }

  try {
    const token = await getAccessToken();
    const redirectUrl = input.returnUrl?.startsWith("http")
      ? input.returnUrl
      : `${appBaseUrl()}${input.returnUrl || "/client/dashboard"}`;

    const res = await fetch(PAYMENTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(getLivePixEnv().apiKey
          ? { "X-Api-Key": getLivePixEnv().apiKey }
          : {}),
      },
      body: JSON.stringify({
        amount: input.amountCents,
        currency: "BRL",
        redirectUrl,
        reference: input.externalId,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[livepix] create payment failed", res.status, text);
      return {
        ok: false,
        error: `LivePix pagamento falhou (${res.status}).`,
        mode: "live",
      };
    }

    const json = (await res.json()) as {
      data?: { reference?: string; redirectUrl?: string };
      reference?: string;
      redirectUrl?: string;
    };
    const data = json.data ?? json;
    const checkoutUrl = data.redirectUrl;
    const providerRef = data.reference || input.externalId;
    if (!checkoutUrl) {
      return {
        ok: false,
        error: "LivePix não retornou redirectUrl.",
        mode: "live",
      };
    }
    return {
      ok: true,
      checkoutUrl,
      providerRef,
      mode: "live",
    };
  } catch (err) {
    console.error("[livepix] createCheckout error", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha LivePix",
      mode: "live",
    };
  }
}

export async function verifyPayment(
  providerRef: string
): Promise<{ paid: boolean; raw?: unknown }> {
  if (!isLivePixConfigured()) {
    console.info("[livepix stub] verifyPayment", providerRef);
    return { paid: false };
  }
  try {
    const token = await getAccessToken();
    const url = new URL(PAYMENTS_URL);
    url.searchParams.set("reference", providerRef);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return { paid: false };
    const json = (await res.json()) as { data?: unknown[] };
    const rows = Array.isArray(json.data) ? json.data : [];
    return { paid: rows.length > 0, raw: json };
  } catch (err) {
    console.error("[livepix] verifyPayment", err);
    return { paid: false };
  }
}

/** Simula confirmação de webhook LivePix (demo local). */
export type StubConfirmInput = {
  requestId: string;
  kind?: "consultation" | "subscription";
  lawyerId?: string;
};
