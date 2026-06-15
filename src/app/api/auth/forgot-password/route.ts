import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, passwordResetEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const ONE_HOUR = 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  // Always return success to prevent user enumeration.
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    // Invalidate any existing tokens.
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const record = await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + ONE_HOUR),
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.get("host")}`;
    const resetUrl = `${baseUrl}/reset-password?token=${record.token}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Reset your Relay password",
        html: passwordResetEmail(user.name, resetUrl),
      });
    } catch (err) {
      console.error("Failed to send reset email:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
