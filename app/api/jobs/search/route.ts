import { NextResponse } from "next/server"

type NormalizedJob = {
  id: string
  title: string
  company: string
  location: string
  created_at: string
  salary?: string
  url: string
  description?: string
  source?: string
}

function normalizeAdzuna(results: any[]): NormalizedJob[] {
  return (results || []).map((r) => {
    const salaryMin = r?.salary_min ? Math.round(r.salary_min) : undefined
    const salaryMax = r?.salary_max ? Math.round(r.salary_max) : undefined
    const salary =
      salaryMin && salaryMax
        ? `₹${salaryMin.toLocaleString("en-IN")} - ₹${salaryMax.toLocaleString("en-IN")}`
        : salaryMin
          ? `₹${salaryMin.toLocaleString("en-IN")}+`
          : undefined

    return {
      id: String(r?.id ?? r?.adref ?? crypto.randomUUID()),
      title: r?.title ?? "Untitled role",
      company: r?.company?.display_name ?? "Unknown company",
      location: r?.location?.display_name ?? "India",
      created_at: r?.created ?? new Date().toISOString(),
      salary,
      url: r?.redirect_url ?? "#",
      description: r?.description,
      source: "adzuna",
    }
  })
}

const MOCK_JOBS: NormalizedJob[] = [
  {
    id: "mock-1",
    title: "Frontend Engineer (React/Next.js)",
    company: "Acme Tech Pvt Ltd",
    location: "Bengaluru, Karnataka",
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    salary: "₹12,00,000 - ₹18,00,000",
    url: "#",
    description: "Build performant UIs using React, Next.js, and TypeScript.",
    source: "mock",
  },
  {
    id: "mock-2",
    title: "Data Analyst",
    company: "InsightWorks India",
    location: "Pune, Maharashtra",
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    salary: "₹6,00,000 - ₹10,00,000",
    url: "#",
    description: "Analyze datasets, build dashboards, and collaborate with stakeholders.",
    source: "mock",
  },
  {
    id: "mock-3",
    title: "Backend Engineer (Node.js)",
    company: "Nimbus Cloud Solutions",
    location: "Hyderabad, Telangana",
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    salary: "₹10,00,000 - ₹16,00,000",
    url: "#",
    description: "Design and implement scalable APIs with Node.js and PostgreSQL.",
    source: "mock",
  },
]

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q") || ""
    const location = searchParams.get("location") || "India"
    const page = Number.parseInt(searchParams.get("page") || "1", 10) || 1
    const resultsPerPage = Math.min(Number.parseInt(searchParams.get("limit") || "20", 10) || 20, 50)

    const appId = process.env.ADZUNA_APP_ID
    const appKey = process.env.ADZUNA_APP_KEY

    // If no credentials, return mock data so UI still works in preview
    if (!appId || !appKey) {
      return NextResponse.json(
        {
          jobs: MOCK_JOBS,
          total: MOCK_JOBS.length,
          page: 1,
          limit: MOCK_JOBS.length,
          provider: "mock",
          warning: "Missing ADZUNA_APP_ID/ADZUNA_APP_KEY environment variables. Returning mock data.",
        },
        { status: 200 },
      )
    }

    // Adzuna API for India: /v1/api/jobs/in/search/{page}
    const endpoint = new URL(`https://api.adzuna.com/v1/api/jobs/in/search/${page}`)
    endpoint.searchParams.set("app_id", appId)
    endpoint.searchParams.set("app_key", appKey)
    endpoint.searchParams.set("results_per_page", String(resultsPerPage))
    endpoint.searchParams.set("what", q)
    endpoint.searchParams.set("where", location)
    endpoint.searchParams.set("content-type", "application/json")
    // Optional freshness filter e.g. "7" days: searchParams.get("days") ?? "7"
    const days = searchParams.get("days")
    if (days) endpoint.searchParams.set("max_days_old", days)

    const res = await fetch(endpoint.toString(), {
      headers: { Accept: "application/json" },
      // Avoid caching to keep "real-time" feel
      cache: "no-store",
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: "Failed to fetch jobs", details: text }, { status: res.status })
    }

    const data = await res.json()
    const normalized = normalizeAdzuna(data?.results || [])
    return NextResponse.json({
      jobs: normalized,
      total: data?.count ?? normalized.length,
      page,
      limit: resultsPerPage,
      provider: "adzuna",
    })
  } catch (err: any) {
    return NextResponse.json({ error: "Unexpected error fetching jobs", details: err?.message }, { status: 500 })
  }
}
