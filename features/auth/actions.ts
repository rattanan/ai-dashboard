"use server";

import { hash } from "@node-rs/argon2";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { registerSchema } from "@/schemas/auth";
import { db } from "@/server/db";
import { logger } from "@/server/services/logger";
import type { AppResult } from "@/types/result";
import { failure, success } from "@/types/result";

export async function registerAction(
  _previous: AppResult<{ registered: true }> | null,
  formData: FormData,
) {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return failure(
      "VALIDATION_ERROR",
      "Please correct the highlighted fields.",
      {
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    );
  }
  try {
    const existing = await db.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });
    if (existing)
      return failure(
        "CONFLICT",
        "An account already exists for this email address.",
      );

    await db.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: await hash(parsed.data.password, {
          algorithm: 2,
          memoryCost: 19456,
          timeCost: 2,
        }),
      },
    });
  } catch (error) {
    logger.error("Registration database operation failed", { error });
    return failure(
      "INTERNAL_ERROR",
      "The account service is temporarily unavailable. Check the application database and try again.",
    );
  }
  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirect: false,
  });
  redirect("/onboarding");
}

export async function loginAction(
  _previous: AppResult<{ authenticated: true }> | null,
  formData: FormData,
) {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/workspace",
    });
    return success({ authenticated: true as const });
  } catch (error) {
    if (error instanceof AuthError)
      return failure("UNAUTHENTICATED", "Email or password is incorrect.");
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
