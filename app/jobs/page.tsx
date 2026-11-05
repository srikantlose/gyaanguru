import { JobsFeed } from "@/components/jobs-feed"

export const metadata = {
  title: "Jobs in India",
  description: "Real-time job updates for the Indian market.",
}

export default function JobsPage() {
  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 space-y-2">
        <h1 className="text-3xl font-semibold text-pretty">Jobs in India</h1>
        <p className="text-muted-foreground">
          Search the latest roles across India. This feed auto-refreshes every minute.
        </p>
      </header>
      <JobsFeed />
    </main>
  )
}
