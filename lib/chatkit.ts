export type ChatKitSessionOptions = {
  user: string
  metadata?: Record<string, unknown>
}

export type ChatKitSessionResult = {
  client_secret: string
  source: "mock" | "hosted"
}

const CHATKIT_API_URL = process.env.CHATKIT_API_URL ?? "https://api.openai.com/v1/chatkit/sessions"
const CHATKIT_WORKFLOW_ID = process.env.CHATKIT_WORKFLOW_ID
const CHATKIT_MOCK_CLIENT_SECRET = process.env.CHATKIT_MOCK_CLIENT_SECRET
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? process.env.OPENAI_API_SECRET_KEY

export class ChatKitConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ChatKitConfigurationError"
  }
}

export async function createChatKitSession({ user, metadata }: ChatKitSessionOptions): Promise<ChatKitSessionResult> {
  if (!CHATKIT_WORKFLOW_ID || !OPENAI_API_KEY) {
    if (CHATKIT_MOCK_CLIENT_SECRET) {
      return { client_secret: CHATKIT_MOCK_CLIENT_SECRET, source: "mock" }
    }

    throw new ChatKitConfigurationError("ChatKit environment variables are not configured.")
  }

  const response = await fetch(CHATKIT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "OpenAI-Beta": "chatkit_beta=v1",
    },
    body: JSON.stringify({
      workflow: { id: CHATKIT_WORKFLOW_ID },
      user,
      metadata,
    }),
  })

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}))
    const message =
      typeof errorPayload?.error === "string"
        ? errorPayload.error
        : `ChatKit session request failed with status ${response.status}`
    throw new Error(message)
  }

  const data = (await response.json()) as { client_secret: string }
  return { client_secret: data.client_secret, source: "hosted" }
}

