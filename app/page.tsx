import { MoodRecommender } from "@/components/mood-recommender"

export default function Home() {
  return (
    <main className="grain stage-glow relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
      <MoodRecommender />
    </main>
  )
}
