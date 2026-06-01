import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const generateBanter = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ gameName: z.string().min(1).max(100) }).parse(input)
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const prompt = `Write a very short (1 sentence, max 10 words), funny, competitive trash-talk or cheer for a player playing ${data.gameName}. Use a mix of English and Hindi (Hinglish) slang. Keep it fun, family-friendly. Output only the line, no quotes.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      return { text: "The AI is meditating. Play on!" };
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content?.replace(/["*]/g, "").trim() || "The AI is meditating. Play on!";
    return { text };
  });