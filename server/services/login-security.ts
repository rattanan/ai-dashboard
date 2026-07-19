import { verify } from "@node-rs/argon2";
import { db } from "@/server/db";
import { env } from "@/schemas/env";
import { consumeRateLimit } from "@/server/services/rate-limit";

function requestContext(request?: Request) {
  const userAgent = request?.headers.get("user-agent")?.slice(0, 500) ?? null;
  const ipAddress =
    request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request?.headers.get("x-real-ip") ||
    null;
  const lower = userAgent?.toLowerCase() ?? "";
  return {
    ipAddress,
    userAgent,
    browser: lower.includes("firefox")
      ? "Firefox"
      : lower.includes("edg/")
        ? "Edge"
        : lower.includes("chrome")
          ? "Chrome"
          : lower.includes("safari")
            ? "Safari"
            : "Unknown",
    operatingSystem: lower.includes("windows")
      ? "Windows"
      : lower.includes("mac os")
        ? "macOS"
        : lower.includes("android")
          ? "Android"
          : lower.includes("iphone") || lower.includes("ipad")
            ? "iOS"
            : lower.includes("linux")
              ? "Linux"
              : "Unknown",
    device: /mobile|android|iphone/.test(lower) ? "Mobile" : "Desktop",
  };
}

async function auditLogin(
  organizationId: string | undefined,
  userId: string | undefined,
  identifier: string,
  outcome: "SUCCESS" | "FAILED" | "DENIED",
  reason: string,
  context: ReturnType<typeof requestContext>,
) {
  if (!organizationId) return;
  await db.auditLog.create({
    data: {
      organizationId,
      actorId: userId,
      actorName: identifier,
      action: outcome === "SUCCESS" ? "LOGIN_SUCCESS" : "LOGIN_FAILED",
      entityType: "User",
      entityId: userId,
      entityName: identifier,
      outcome,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { reason },
    },
  });
}

export async function authenticateCredentials(
  identifier: string,
  password: string,
  request?: Request,
) {
  const normalized = identifier.trim().toLowerCase();
  const context = requestContext(request);
  const config = env();
  if (
    !(await consumeRateLimit(
      "login",
      context.ipAddress || normalized,
      config.LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
      config.LOGIN_RATE_LIMIT_WINDOW_MINUTES,
    ))
  )
    return null;

  const user = await db.user.findFirst({
    where: {
      deletedAt: null,
      OR: [{ email: normalized }, { username: normalized }],
    },
    include: { memberships: { take: 1, select: { organizationId: true } } },
  });
  const historyBase = {
    organizationId: user?.memberships[0]?.organizationId,
    userId: user?.id,
    identifier: normalized,
    ...context,
  };
  if (!user?.passwordHash) {
    await db.loginHistory.create({
      data: {
        ...historyBase,
        status: "FAILED",
        failureReason: "INVALID_CREDENTIALS",
      },
    });
    return null;
  }
  if (user.status === "DISABLED") {
    await db.loginHistory.create({
      data: {
        ...historyBase,
        status: "FAILED",
        failureReason: "ACCOUNT_DISABLED",
      },
    });
    await auditLogin(
      historyBase.organizationId,
      user.id,
      normalized,
      "DENIED",
      "ACCOUNT_DISABLED",
      context,
    );
    return null;
  }
  if (
    user.status === "LOCKED" &&
    user.lockedUntil &&
    user.lockedUntil <= new Date()
  ) {
    await db.user.update({
      where: { id: user.id },
      data: { status: "ACTIVE", lockedUntil: null, failedLoginCount: 0 },
    });
    user.status = "ACTIVE";
  }
  if (user.status === "LOCKED") {
    await db.loginHistory.create({
      data: {
        ...historyBase,
        status: "LOCKED",
        failureReason: "ACCOUNT_LOCKED",
      },
    });
    await auditLogin(
      historyBase.organizationId,
      user.id,
      normalized,
      "DENIED",
      "ACCOUNT_LOCKED",
      context,
    );
    return null;
  }

  if (!(await verify(user.passwordHash, password))) {
    const failedLoginCount = user.failedLoginCount + 1;
    const shouldLock = failedLoginCount >= config.MAX_FAILED_LOGIN_ATTEMPTS;
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount,
          ...(shouldLock
            ? {
                status: "LOCKED",
                lockedUntil: new Date(
                  Date.now() + config.ACCOUNT_LOCK_DURATION_MINUTES * 60_000,
                ),
                sessionVersion: { increment: 1 },
              }
            : {}),
        },
      }),
      db.loginHistory.create({
        data: {
          ...historyBase,
          status: shouldLock ? "LOCKED" : "FAILED",
          failureReason: shouldLock
            ? "MAX_ATTEMPTS_EXCEEDED"
            : "INVALID_CREDENTIALS",
        },
      }),
    ]);
    await auditLogin(
      historyBase.organizationId,
      user.id,
      normalized,
      shouldLock ? "DENIED" : "FAILED",
      shouldLock ? "MAX_ATTEMPTS_EXCEEDED" : "INVALID_CREDENTIALS",
      context,
    );
    return null;
  }

  const history = await db.loginHistory.create({
    data: { ...historyBase, status: "SUCCESS" },
  });
  await db.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  await auditLogin(
    historyBase.organizationId,
    user.id,
    normalized,
    "SUCCESS",
    "AUTHENTICATED",
    context,
  );
  return { user, loginHistoryId: history.id };
}
