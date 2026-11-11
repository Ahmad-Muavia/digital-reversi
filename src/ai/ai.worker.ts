/// <reference lib="webworker" />
import { answerRequest } from './aiClient'
import type { AiMoveReply, AiMoveRequest } from './contract'

// Runs the AI search off the main thread so the page stays responsive.
// Speaks the D3 contract: receives an AiMoveRequest, replies with an AiMoveReply.
self.onmessage = (event: MessageEvent<AiMoveRequest>) => {
  let reply: AiMoveReply
  try {
    reply = answerRequest(event.data)
  } catch {
    reply = { requestId: String(event.data?.requestId), error: 'internal_error' }
  }
  self.postMessage(reply)
}
