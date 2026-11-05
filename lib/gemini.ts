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

type GenerateOptions = {
  systemInstruction?: string
  temperature?: number
  /** Ask the model for a JSON response body (application/json). */
  json?: boolean
}

/** Single-shot or multi-turn generation; returns the model's text output. */
export async function generateText(contents: string | Content[], opts: GenerateOptions = {}): Promise<string> {
  const response = await getClient().models.generateContent({
    model: getGeminiModel(),
    contents,
    config: {
      ...(opts.systemInstruction ? { systemInstruction: opts.systemInstruction } : {}),
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  })
  return (response.text ?? "").trim()
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
