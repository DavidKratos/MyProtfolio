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

  const cleanQuestion = question.slice(0, 360);
  const cleanContext = typeof context === "string" ? context.slice(0, 2400) : "";

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
          "You are David Raj Ramakrishnan's portfolio assistant. Answer only from the supplied profile context. Be concise, professional, and useful. If the question asks for something outside the profile, say you can only answer about David's work, skills, projects, and contact details.",
        input: `Profile context:\n${cleanContext}\n\nVisitor question:\n${cleanQuestion}`,
      }),
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      return response.status(openAiResponse.status).json({ error: errorText });
    }

    const data = await openAiResponse.json();
    return response.status(200).json({
      answer: data.output_text || "I could not generate a response right now.",
    });
  } catch (error) {
    return response.status(500).json({ error: "Assistant request failed." });
  }
}
