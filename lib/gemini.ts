import { GoogleGenAI, type Content } from "@google/genai"

// gemini-2.0-flash(-exp), which this app originally used, was retired by Google.
// Override with GEMINI_MODEL to pin a different model without a code change.
export const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash"

export class ModelOutputError extends Error {
  constructor(public readonly raw: string) {
    super("Model returned non-JSON output")
    this.name = "ModelOutputError"
  }
}

let client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set")
  }
  if (!client) {
    // GEMINI_BASE_URL is optional: point it at a proxy or gateway in front of the Gemini API.
    const baseUrl = process.env.GEMINI_BASE_URL
    client = new GoogleGenAI({ apiKey, ...(baseUrl ? { httpOptions: { baseUrl } } : {}) })
  }
  return client
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL
}

// Tried in order after the primary model when it is overloaded, rate-limited or unavailable for this key.
// Free-tier quotas are per model, so spreading across several models keeps the app answering.
// (gemini-2.5-flash is not offered to new API users, so it is not in the list.)
const DEFAULT_FALLBACK_MODELS = ["gemini-3.5-flash-lite", "gemini-3.7-flash", "gemini-3.8-flash", "gemini-3.5-flash"]

function modelChain(): string[] {
  const primary = getGeminiModel()
  // An empty value (e.g. copied from .env.example) means "use the defaults".
  const fallbacks = (process.env.GEMINI_FALLBACK_MODELS?.trim() || DEFAULT_FALLBACK_MODELS.join(","))
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean)
  return [primary, ...fallbacks.filter((m) => m !== primary)]
}

/** Shown to users when every model is busy; routes return it with HTTP 503. */
export const AI_BUSY_MESSAGE = "The AI is very busy right now. Please try again in a moment."

/** Every model in the chain was overloaded / rate-limited / unavailable. */
export class AIUnavailableError extends Error {
  constructor(public readonly cause?: unknown) {
    super(AI_BUSY_MESSAGE)
    this.name = "AIUnavailableError"
  }
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])
const ATTEMPTS_PER_MODEL = 2

function errorStatus(err: unknown): number | undefined {
  const status = (err as { status?: unknown })?.status
  return typeof status === "number" ? status : undefined
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type GenerateOptions = {
  systemInstruction?: string
  temperature?: number
  /** Ask the model for a JSON response body (application/json). */
  json?: boolean
}

/**
 * Single-shot or multi-turn generation; returns the model's text output.
 * Retries temporary failures (429/5xx) with backoff, then falls back through the model chain.
 * Throws AIUnavailableError if no model could answer.
 */
export async function generateText(contents: string | Content[], opts: GenerateOptions = {}): Promise<string> {
  const config = {
    ...(opts.systemInstruction ? { systemInstruction: opts.systemInstruction } : {}),
    ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    ...(opts.json ? { responseMimeType: "application/json" } : {}),
  }
  let lastError: unknown
  for (const model of modelChain()) {
    for (let attempt = 0; attempt < ATTEMPTS_PER_MODEL; attempt++) {
      try {
        const response = await getClient().models.generateContent({ model, contents, config })
        return (response.text ?? "").trim()
      } catch (err) {
        lastError = err
        const status = errorStatus(err)
        if (status === 404) {
          console.warn(`[gemini] ${model} is not available for this key (404); trying next model`)
          break
        }
        if (status === undefined || !RETRYABLE_STATUS.has(status)) throw err
        // A used-up daily quota won't recover in seconds: move straight to the next model.
        const dailyQuota = status === 429 && /PerDay/i.test(String((err as Error)?.message))
        const retrySame = !dailyQuota && attempt + 1 < ATTEMPTS_PER_MODEL
        console.warn(`[gemini] ${model} returned ${status}${dailyQuota ? " (daily quota)" : ""}; ${retrySame ? "retrying" : "trying next model"}`)
        if (!retrySame) break
        await sleep(600 * 2 ** attempt + Math.random() * 300)
      }
    }
  }
  throw new AIUnavailableError(lastError)
}

/** Pulls a JSON document out of model text: a fenced block if present, else the outermost {...}. */
export function extractJsonPayload(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence && fence[1]) return fence[1].trim()
  const first = text.indexOf("{")
  const last = text.lastIndexOf("}")
  if (first !== -1 && last !== -1 && last > first) return text.slice(first, last + 1).trim()
  return text.trim()
}

/** Generates and parses a JSON response. Throws ModelOutputError if the output is not valid JSON. */
export async function generateJson(prompt: string): Promise<unknown> {
  const text = await generateText(prompt, { json: true })
  try {
    return JSON.parse(extractJsonPayload(text))
  } catch {
    throw new ModelOutputError(text)
  }
}
