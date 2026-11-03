import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  throw new Error("Missing GROQ_API_KEY in environment");
}

export const groq = new Groq({ apiKey });

export const GROQ_MODEL = "openai/gpt-oss-20b";

export async function classifyText(text: string, categories: string[]): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      {
        role: "system",
        content: `Classify the user's message into exactly one of these categories: ${categories.join(", ")}. Reply with only the category name, nothing else.`,
      },
      { role: "user", content: text },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() ?? "unknown";
}
