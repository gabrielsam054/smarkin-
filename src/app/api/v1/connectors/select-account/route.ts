import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/requireUser";
import { buildServiceRoleClient } from "@/lib/supabase/serviceClient";
import { decryptToken } from "@/lib/crypto/tokenEncryption";
import { completeConnection } from "@/lib/connectors/completeConnection";

const PENDING_SELECTION_COOKIE = "smarkin_pending_account_selection";

interface PendingSelection {
  connectorKey: string;
  workspaceId: string;
  accounts: Array<{ externalId: string; displayName: string }>;
  encAccessToken: string;
  encRefreshToken: string | null;
  expiresAt: string | null;
  scopes: string[];
}

export async function POST(request: NextRequest) {
  const integrationsUrl = new URL("/integrations", request.nextUrl.origin);
  const { user } = await requireUser("/integrations");

  const cookieStore = await cookies();
  const raw = cookieStore.get(PENDING_SELECTION_COOKIE)?.value;
  cookieStore.delete(PENDING_SELECTION_COOKIE); // single-use, regardless of outcome below — same pattern as the OAuth state cookie

  if (!raw) {
    integrationsUrl.searchParams.set("connect_error", "selection_expired");
    return NextResponse.redirect(integrationsUrl);
  }

  let pending: PendingSelection;
  try {
    pending = JSON.parse(raw);
  } catch {
    integrationsUrl.searchParams.set("connect_error", "selection_expired");
    return NextResponse.redirect(integrationsUrl);
  }

  const formData = await request.formData();
  const chosenExternalId = formData.get("externalId");
  if (typeof chosenExternalId !== "string") {
    integrationsUrl.searchParams.set("connect_error", "selection_expired");
    return NextResponse.redirect(integrationsUrl);
  }

  // Never trust the submitted id blindly — it must be one of the
  // accounts actually discovered for this token, not an arbitrary
  // string a client could submit.
  const chosenAccount = pending.accounts.find((a) => a.externalId === chosenExternalId);
  if (!chosenAccount) {
    integrationsUrl.searchParams.set("connect_error", "selection_expired");
    return NextResponse.redirect(integrationsUrl);
  }

  const supabase = buildServiceRoleClient();
  if (!supabase) {
    integrationsUrl.searchParams.set("connect_error", "backend_not_ready");
    return NextResponse.redirect(integrationsUrl);
  }

  try {
    const accessToken = decryptToken(Buffer.from(pending.encAccessToken, "base64"));
    const refreshToken = pending.encRefreshToken
      ? decryptToken(Buffer.from(pending.encRefreshToken, "base64"))
      : null;

    const result = await completeConnection({
      supabase,
      workspaceId: pending.workspaceId,
      connectorKey: pending.connectorKey,
      userId: user.id,
      account: chosenAccount,
      tokens: {
        accessToken, refreshToken,
        expiresAt: pending.expiresAt ? new Date(pending.expiresAt) : null,
        scopes: pending.scopes,
      },
    });

    if (!result.ok) {
      integrationsUrl.searchParams.set("connect_error", result.errorCode);
      return NextResponse.redirect(integrationsUrl);
    }

    integrationsUrl.searchParams.set("connected", pending.connectorKey);
    return NextResponse.redirect(integrationsUrl);
  } catch (err) {
    console.error("[select-account] failed to complete connection:", err);
    integrationsUrl.searchParams.set("connect_error", "exchange_failed");
    return NextResponse.redirect(integrationsUrl);
  }
}
