import { NextResponse } from "next/server";
import { z } from "zod";
import { login } from "@/server/auth";
import { rateLimit } from "@/server/ratelimit";
import { ApiError } from "@/server/rpgers-client";

const bodySchema = z.object({
  pseudo: z.string().min(1).max(50),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const rl = rateLimit(`login:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de tentatives, réessaie plus tard." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterS) } },
    );
  }

  const body = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  try {
    const { mustChangePassword } = await login(
      body.data.pseudo,
      body.data.password,
    );
    return NextResponse.json({ success: true, mustChangePassword });
  } catch (error) {
    if (error instanceof ApiError) {
      // Message générique volontairement (pas d'énumération pseudo/mot de passe)
      return NextResponse.json(
        { error: error.message },
        { status: error.status || 502 },
      );
    }
    throw error;
  }
}
