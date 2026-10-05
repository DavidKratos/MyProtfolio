export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return response.status(503).json({ error: "Assistant is not configured yet." });
  }

  const { question, context } = request.body || {};
  if (!question || typeof question !== "string") {
    return response.status(400).json({ error: "Question is required." });
  }

  const cleanQuestion = question.slice(0, 12000);
  const cleanContext = typeof context === "string" ? context.slice(0, 2400) : "";

  const getResponseText = (data) => {
    if (typeof data.output_text === "string" && data.output_text.trim()) {
      return data.output_text.trim();
    }

    const text = data.output
      ?.flatMap((item) => item.content || [])
      .filter((part) => part.type === "output_text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("\n")
      .trim();

    return text || "";
  };

  try {
    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5",
        instructions:
          "You are an AI assistant embedded in David Raj Ramakrishnan's portfolio. Answer like a helpful ChatGPT-style assistant. If the user asks about David, use the supplied profile context and do not invent facts. If the user pastes C#, Unity, WebGL, JavaScript, or other code, explain it, debug it, refactor it, or suggest fixes clearly. For code answers, be practical and include corrected snippets when useful. Do not claim to run code. Do not ask for secrets, API keys, passwords, tokens, or confidential company data.",
        input: `David's profile context, for portfolio-related questions:\n${cleanContext}\n\nUser message:\n${cleanQuestion}`,
      }),
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      return response.status(openAiResponse.status).json({ error: errorText });
    }

    const data = await openAiResponse.json();
    const answer = getResponseText(data);

    return response.status(200).json({
      answer:
        answer ||
        "I can answer questions about David's work or help with pasted code. Try asking about SpeedShelf Lite, XR platforms, WebGL, AI retail intelligence, or paste a C# snippet.",
    });
  } catch (error) {
    return response.status(500).json({ error: "Assistant request failed." });
  }
}
