import { NextResponse } from "next/server"
import { createChatKitSession, ChatKitConfigurationError } from "@/lib/chatkit"

type SessionRequestPayload = {
  user?: string
  existingClientSecret?: string | null
  metadata?: Record<string, unknown>
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as SessionRequestPayload
    const user = typeof payload.user === "string" && payload.user.trim().length > 0 ? payload.user : "jetvision-agent"

    const session = await createChatKitSession({
      user,
      metadata: payload.metadata,
    })

    return NextResponse.json(session)
  } catch (error) {
    if (error instanceof ChatKitConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }

    const message = error instanceof Error ? error.message : "Unexpected ChatKit session error."
    console.error("[chatkit/session] failed to create client secret", error)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
