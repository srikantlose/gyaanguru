import { JobsFeed } from "@/components/jobs-feed"
import { PageHeader } from "@/components/page-header"
import { JobsIllustration } from "@/components/illustrations"

export const metadata = {
  title: "Jobs in India",
  description: "Real-time job updates for the Indian market.",
}

export default function JobsPage() {
  return (
    <main className="container mx-auto max-w-6xl px-4 py-10 sm:py-12">
      <PageHeader
        eyebrow="Jobs"
        tone="lagoon"
        title="Jobs in India"
        description="Search the latest roles across India. This feed auto-refreshes every minute."
        art={<JobsIllustration />}
      />
      <JobsFeed />
    </main>
  )
}
