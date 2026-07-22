import { z } from "zod";
import { envOrFile } from "@/server/secret-env";

const generateContentResponseSchema = z
  .object({
    candidates: z.array(
      z.object({
        content: z.object({
          parts: z.array(z.object({ text: z.string().optional() })),
        }),
      }),
    ),
  })
  .loose();

type GeminiJsonInput<T> = {
  prompt: string;
  systemInstruction: string;
  responseSchema: Record<string, unknown>;
  schema: z.ZodType<T>;
};

/** Appel JSON à generateContent. Retourne null pour permettre un repli local. */
export async function generateGeminiJson<T>({
  prompt,
  systemInstruction,
  responseSchema,
  schema,
}: GeminiJsonInput<T>): Promise<T | null> {
  const apiKey = envOrFile("GEMINI_API_KEY");
  if (!apiKey) return null;
  const model = process.env.GEMINI_RECOMMENDER_MODEL ?? "gemini-3.6-flash";

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema,
          },
        }),
        signal: AbortSignal.timeout(35_000),
      },
    );
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      console.warn("[recommendations] Gemini a refusé la requête", {
        status: response.status,
        reason: body.error?.message ?? "réponse inconnue",
      });
      return null;
    }

    const generatedContent = generateContentResponseSchema.safeParse(
      await response.json(),
    );
    if (!generatedContent.success) return null;
    const text = generatedContent.data.candidates[0]?.content.parts.find(
      ({ text: value }) => value,
    )?.text;
    if (!text) return null;

    const parsed = schema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch (error) {
    console.warn("[recommendations] Gemini indisponible", error);
    return null;
  }
}
