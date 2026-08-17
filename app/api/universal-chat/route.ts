import { universalChatRequestSchema } from "@/schemas/knowledge";
import { getAuthorizationContext } from "@/server/auth/authorization";
import { sendUniversalChatMessage } from "@/server/services/chat-service";

export async function POST(request: Request) {
  const context = await getAuthorizationContext();
  if (!context)
    return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const parsed = universalChatRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      {
        error: "VALIDATION_ERROR",
        message: "Check the chat scope and message.",
      },
      { status: 422 },
    );
  const result = await sendUniversalChatMessage(context, parsed.data);
  if (!result.ok)
    return Response.json(
      { error: result.error.code, message: result.error.message },
      {
        status:
          result.error.code === "NOT_FOUND"
            ? 404
            : result.error.code === "AI_RATE_LIMITED"
              ? 429
              : 400,
      },
    );
  return Response.json(result.data, {
    headers: { "cache-control": "no-store" },
  });
}
