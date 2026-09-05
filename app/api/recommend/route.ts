import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type MediaType = "movie" | "book";

type RecommendBody = {
  mood?: unknown;
  type?: unknown;
  subcategory?: unknown;
};

type Recommendation = {
  title: string;
  creator: string;
  year: string;
  reason: string;
};

function buildLink(type: MediaType, title: string, creator: string) {
  const query = encodeURIComponent(`${title} ${creator}`.trim());
  if (type === "movie") {
    return `https://www.justwatch.com/us/search?q=${query}`;
  }
  return `https://www.goodreads.com/search?q=${query}`;
}

function subcategoryInstruction(type: MediaType, subcategory: string): string {
  if (type === "movie") {
    if (subcategory === "Bollywood") {
      return "The movie MUST be a Bollywood film from the mainstream Hindi-language Indian film industry. Do not give a Pakistani, Hollywood, or unrelated Indian-language film.";
    }
    if (subcategory === "Hollywood") {
      return "The movie MUST be a Hollywood film from the mainstream American film industry. Do not treat a merely English-language British film as Hollywood.";
    }
    if (subcategory === "Lollywood") {
      return "The movie MUST be a Pakistani film associated with Lollywood/Pakistani cinema, especially the Lahore film industry. Prefer a real, well-known existing title.";
    }
  }

  if (type === "book") {
    if (subcategory === "English writer") {
      return "The book MUST be an existing book originally written in English by an English-language author.";
    }
    if (subcategory === "Urdu writer") {
      return "The book MUST be an existing book originally written in Urdu by an Urdu-language author. Give the title and author's name in Latin transliteration unless Urdu script is useful.";
    }
  }

  return "";
}

function isValidRecommendation(value: unknown): value is Recommendation {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.title === "string" && item.title.trim().length > 0 &&
    typeof item.creator === "string" && item.creator.trim().length > 0 &&
    typeof item.year === "string" && item.year.trim().length > 0 &&
    typeof item.reason === "string" && item.reason.trim().length > 0
  );
}

function getAllowedSubcategories(type: MediaType) {
  return type === "movie"
    ? ["Bollywood", "Hollywood", "Lollywood"]
    : ["English writer", "Urdu writer"];
}

export async function POST(req: NextRequest) {
  let body: RecommendBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const mood = typeof body.mood === "string" ? body.mood.trim() : "";
  const type = body.type;
  const subcategory = typeof body.subcategory === "string" ? body.subcategory.trim() : "";

  if (!mood) {
    return NextResponse.json({ error: "Tell it a mood first." }, { status: 400 });
  }

  if (type !== "movie" && type !== "book") {
    return NextResponse.json({ error: "Choose either a movie or a book." }, { status: 400 });
  }

  const mediaType = type as MediaType;
  const allowedSubcategories = getAllowedSubcategories(mediaType);

  if (!subcategory || !allowedSubcategories.includes(subcategory)) {
    return NextResponse.json(
      { error: `Choose one of: ${allowedSubcategories.join(", ")}.` },
      { status: 400 }
    );
  }

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    console.error("GROQ_API_KEY is missing. Add it to .env.local and restart Next.js.");
    return NextResponse.json(
      { error: "Groq API key is missing. Add GROQ_API_KEY to .env.local and restart the server." },
      { status: 500 }
    );
  }

  const constraint = subcategoryInstruction(mediaType, subcategory);

  const system = `You are a warm, well-read recommender with excellent, specific taste in film and literature.
Given a person's mood and whether they want a movie or a book, suggest exactly ONE real, existing title that genuinely fits that mood.
Never invent a title, creator, year, or publication/release information. Prefer a well-known, verifiable real title when possible.
Avoid the single most obvious cliché pick for that mood, but factual accuracy is more important than novelty.
${constraint}
Respond ONLY as a valid JSON object with exactly these four string fields:
{"title":"...","creator":"...","year":"...","reason":"..."}
For a movie, creator means the director. For a book, creator means the author. The reason should be 2-3 natural sentences written directly to the person explaining why this specific title fits their mood.`;

  const userPrompt = `Mood: ${mood}\nThey want a: ${mediaType}\nPreference: ${subcategory}\nSuggest exactly one ${mediaType}.`;

  try {
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        temperature: 0.5,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
      cache: "no-store",
    });

    const responseData = await groqResponse.json().catch(() => null);

    if (!groqResponse.ok) {
      const apiMessage =
        responseData?.error?.message ||
        responseData?.message ||
        `Groq returned HTTP ${groqResponse.status}`;

      console.error("Groq API error:", groqResponse.status, apiMessage);

      if (groqResponse.status === 401) {
        return NextResponse.json(
          { error: "Groq API key is invalid. Check GROQ_API_KEY in .env.local." },
          { status: 502 }
        );
      }

      if (groqResponse.status === 429) {
        return NextResponse.json(
          { error: "Groq rate limit reached. Please wait a little and try again." },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: `Groq API error: ${apiMessage}` },
        { status: 502 }
      );
    }

    const raw = responseData?.choices?.[0]?.message?.content;
    if (typeof raw !== "string" || !raw.trim()) {
      console.error("Groq returned an empty response:", responseData);
      return NextResponse.json(
        { error: "Groq returned an empty recommendation. Please try again." },
        { status: 502 }
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (parseError) {
      console.error("Invalid JSON from Groq:", raw, parseError);
      return NextResponse.json(
        { error: "The AI returned an unreadable recommendation. Please try again." },
        { status: 502 }
      );
    }

    if (!isValidRecommendation(parsed)) {
      console.error("Invalid recommendation shape:", parsed);
      return NextResponse.json(
        { error: "The AI returned incomplete recommendation details. Please try again." },
        { status: 502 }
      );
    }

    const link = buildLink(mediaType, parsed.title, parsed.creator);

    return NextResponse.json({
      ...parsed,
      link,
      type: mediaType,
      subcategory,
    });
  } catch (error) {
    console.error("Recommendation request failed:", error);
    return NextResponse.json(
      { error: "Could not connect to Groq. Check your internet connection and try again." },
      { status: 502 }
    );
  }
}
