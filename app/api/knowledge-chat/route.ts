import { getAuthorizationContext } from "@/server/auth/authorization";
import { chatRequestSchema } from "@/schemas/knowledge";
import { sendKnowledgeChatMessage } from "@/server/services/chat-service";

export async function POST(request: Request) {
  const context = await getAuthorizationContext();
  if (!context)
    return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const parsed = chatRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      { error: "VALIDATION_ERROR", message: "Enter a valid message." },
      { status: 400 },
    );
  try {
    const result = await sendKnowledgeChatMessage(context, {
      ...parsed.data,
      authMode: context.authMode ?? "LOCAL",
    });
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
    return Response.json(result.data);
  } catch (error) {
    const notFound = error instanceof Error && error.message === "NOT_FOUND";
    return Response.json(
      {
        error: notFound ? "NOT_FOUND" : "INTERNAL_ERROR",
        message: notFound
          ? "Bot not found."
          : "The message could not be completed.",
      },
      { status: notFound ? 404 : 500 },
    );
  }
}
