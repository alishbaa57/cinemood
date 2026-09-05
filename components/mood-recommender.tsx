"use client"

import { useState } from "react"
import { Film, BookOpen, ArrowRight, ArrowLeft, ExternalLink, RotateCcw, Ticket } from "lucide-react"

type Step = "intro" | "mood" | "type" | "subcategory" | "loading" | "result" | "error"
type MediaType = "movie" | "book"

type Recommendation = {
  title: string
  creator: string
  year: string
  reason: string
  link: string
  type: MediaType
  subcategory: string | null
}

const MOOD_PROMPTS = [
  "a little homesick",
  "restless and wide awake",
  "quietly heartbroken",
  "ready for an adventure",
  "soft and nostalgic",
  "wound up and need to laugh",
]

const MOVIE_INDUSTRIES = ["Bollywood", "Hollywood", "Lollywood"]
const BOOK_LANGUAGES = ["English writer", "Urdu writer"]

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-5 flex items-center justify-center gap-3 text-xs font-medium uppercase tracking-[0.35em] text-gold/80">
      <span className="h-px w-8 bg-gold/40" />
      {children}
      <span className="h-px w-8 bg-gold/40" />
    </p>
  )
}

export function MoodRecommender() {
  const [step, setStep] = useState<Step>("intro")
  const [mood, setMood] = useState("")
  const [type, setType] = useState<MediaType | null>(null)
  const [subcategory, setSubcategory] = useState<string | null>(null)
  const [result, setResult] = useState<Recommendation | null>(null)
  const [errorMessage, setErrorMessage] = useState("")

  function chooseType(chosenType: MediaType) {
    setType(chosenType)
    setSubcategory(null)
    setStep("subcategory")
  }

  async function fetchRecommendation(chosenType: MediaType, chosenSubcategory: string) {
    setType(chosenType)
    setSubcategory(chosenSubcategory)
    setStep("loading")
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, type: chosenType, subcategory: chosenSubcategory }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMessage(data.error || "Something went sideways.")
        setStep("error")
        return
      }
      setResult(data)
      setStep("result")
    } catch {
      setErrorMessage("Couldn't reach the recommender. Check your connection and try again.")
      setStep("error")
    }
  }

  function startOver() {
    setMood("")
    setType(null)
    setSubcategory(null)
    setResult(null)
    setErrorMessage("")
    setStep("intro")
  }

  function askAgainSameMood() {
    setType(null)
    setSubcategory(null)
    setResult(null)
    setStep("type")
  }

  const subcategoryOptions =
    type === "movie" ? MOVIE_INDUSTRIES : type === "book" ? BOOK_LANGUAGES : []

  return (
    <div className="w-full max-w-xl">
      {step === "intro" && (
        <section className="animate-rise text-center">
          <Kicker>Mood Reel</Kicker>
          <h1 className="text-balance font-serif text-5xl leading-[1.02] tracking-tight text-foreground sm:text-6xl">
            What are you in the mood for, <span className="italic text-gold">tonight?</span>
          </h1>
          <p className="mx-auto mt-6 max-w-md text-pretty text-lg leading-relaxed text-muted-foreground">
            Tell it how you&apos;re feeling and it finds one film or one book that
            actually fits — never just the obvious pick.
          </p>
          <button
            onClick={() => setStep("mood")}
            className="focus-ring group mt-10 inline-flex items-center gap-2 rounded-full bg-gold px-8 py-4 font-medium text-gold-foreground transition-transform hover:scale-[1.02]"
          >
            Tell it your mood
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </section>
      )}

      {step === "mood" && (
        <section className="animate-rise">
          <div className="rounded-3xl border border-border bg-card/70 px-8 py-10 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur-sm sm:px-12 sm:py-12">
            <Kicker>Scene one</Kicker>
            <h2 className="text-center font-serif text-3xl text-foreground sm:text-4xl">
              How are you feeling right now?
            </h2>
            <p className="mt-3 text-center text-muted-foreground">
              A word, a sentence, a whole paragraph — whatever&apos;s true.
            </p>
            <label htmlFor="mood-input" className="sr-only">
              Your mood
            </label>
            <textarea
              id="mood-input"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              placeholder="e.g. tired in a good way, like I just got back from somewhere"
              rows={2}
              className="focus-ring mt-8 w-full resize-none border-b-2 border-border bg-transparent py-2 font-serif text-xl italic text-foreground outline-none transition-colors placeholder:not-italic placeholder:text-muted-foreground/50 focus:border-gold"
            />

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {MOOD_PROMPTS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMood(m)}
                  className="focus-ring rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:border-gold/60 hover:text-gold"
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="mt-9 flex items-center justify-center">
              <button
                onClick={() => mood.trim() && setStep("type")}
                disabled={!mood.trim()}
                className="focus-ring group inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 font-medium text-gold-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-30"
              >
                Continue
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </section>
      )}

      {step === "type" && (
        <section className="animate-rise text-center">
          <Kicker>Feeling {mood}</Kicker>
          <h2 className="font-serif text-3xl text-foreground sm:text-4xl">
            Would you rather watch, or read?
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            <button
              onClick={() => chooseType("movie")}
              className="focus-ring group rounded-3xl border border-border bg-card/60 px-8 py-10 text-left transition-colors hover:border-gold/60"
            >
              <Film className="h-8 w-8 text-gold transition-transform group-hover:scale-110" />
              <span className="mt-6 block font-serif text-2xl text-foreground">A movie</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Two hours in the dark
              </span>
            </button>
            <button
              onClick={() => chooseType("book")}
              className="focus-ring group rounded-3xl border border-border bg-card/60 px-8 py-10 text-left transition-colors hover:border-terracotta/60"
            >
              <BookOpen className="h-8 w-8 text-terracotta transition-transform group-hover:scale-110" />
              <span className="mt-6 block font-serif text-2xl text-foreground">A book</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Something to sink into
              </span>
            </button>
          </div>
          <button
            onClick={() => setStep("mood")}
            className="focus-ring mx-auto mt-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            change your mood
          </button>
        </section>
      )}

      {step === "subcategory" && type && (
        <section className="animate-rise text-center">
          <Kicker>Feeling {mood}</Kicker>
          <h2 className="font-serif text-3xl text-foreground sm:text-4xl">
            {type === "movie" ? "Which industry?" : "Which writer's language?"}
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            {subcategoryOptions.map((option) => (
              <button
                key={option}
                onClick={() => fetchRecommendation(type, option)}
                className={`focus-ring min-w-[9rem] flex-1 rounded-2xl border bg-card/60 px-6 py-8 font-serif text-xl text-foreground transition-colors ${
                  type === "movie" ? "border-border hover:border-gold/60" : "border-border hover:border-terracotta/60"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep("type")}
            className="focus-ring mx-auto mt-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            back
          </button>
        </section>
      )}

      {step === "loading" && (
        <section className="animate-rise text-center">
          <div className="mb-8 flex items-end justify-center gap-2.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="h-3 w-3 rounded-full bg-gold animate-reel"
                style={{ animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </div>
          <p className="font-serif text-2xl italic text-muted-foreground">
            finding something for {mood}
            <span className="text-gold">…</span>
          </p>
        </section>
      )}

      {step === "result" && result && (
        <section className="animate-rise">
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]">
            <div
              className={`flex items-center gap-2 px-8 py-4 text-xs font-medium uppercase tracking-[0.3em] ${
                result.type === "movie" ? "text-gold" : "text-terracotta"
              }`}
            >
              {result.type === "movie" ? <Film className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
              {result.type === "movie" ? "Now showing" : "On the shelf"}
              {result.subcategory ? <span className="text-muted-foreground/70">· {result.subcategory}</span> : null}
            </div>
            <div className="border-t border-dashed border-border px-8 py-9 sm:px-12">
              <p className="text-sm text-muted-foreground">for feeling {mood}</p>
              <h2 className="mt-2 text-balance font-serif text-4xl italic leading-tight text-foreground sm:text-5xl">
                {result.title}
              </h2>
              <p className="mt-3 text-muted-foreground">
                {result.creator} <span className="text-border">·</span> {result.year}
              </p>
              <p className="mt-6 text-pretty text-lg leading-relaxed text-foreground/90">
                {result.reason}
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <a
                  href={result.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`focus-ring group inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-medium transition-transform hover:scale-[1.02] ${
                    result.type === "movie"
                      ? "bg-gold text-gold-foreground"
                      : "bg-terracotta text-terracotta-foreground"
                  }`}
                >
                  {result.type === "movie" ? "Find where to watch" : "Find this book"}
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  onClick={askAgainSameMood}
                  className="focus-ring inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Ticket className="h-4 w-4" />
                  try the other kind
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={startOver}
            className="focus-ring mx-auto mt-6 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            start over with a new mood
          </button>
        </section>
      )}

      {step === "error" && (
        <section className="animate-rise text-center">
          <div className="rounded-3xl border border-terracotta/40 bg-card px-8 py-10">
            <h2 className="font-serif text-3xl text-foreground">That didn&apos;t work.</h2>
            <p className="mt-3 text-muted-foreground">{errorMessage}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => type && subcategory && fetchRecommendation(type, subcategory)}
                className="focus-ring rounded-full bg-gold px-7 py-3.5 font-medium text-gold-foreground transition-transform hover:scale-[1.02]"
              >
                Try again
              </button>
              <button
                onClick={startOver}
                className="focus-ring text-muted-foreground transition-colors hover:text-foreground"
              >
                start over
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
