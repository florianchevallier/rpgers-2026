import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/server/ratelimit";
import { registerOfficial } from "@/server/rpgers-client";

const bodySchema = z.object({
  pseudo: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[\w-]+$/, "Lettres, chiffres, _ et - uniquement"),
  email: z.email().optional().or(z.literal("")),
  password: z.string().min(6).max(200),
  isAdult: z.boolean(),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const rl = rateLimit(`register:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de tentatives, réessaie plus tard." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterS) } },
    );
  }

  const body = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues[0]?.message ?? "Requête invalide" },
      { status: 400 },
    );
  }

  const { pseudo, email, password, isAdult } = body.data;
  await registerOfficial({
    pseudo,
    email: email || undefined,
    password,
    isAdult,
  });
  return NextResponse.json({ success: true });
}
