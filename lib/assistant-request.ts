export const MAX_CHAT_MESSAGE = 3000;
export const MAX_CHAT_HISTORY = 12000;

/** Retain recent context without silently cutting the visitor's latest question. */
export function assistantHistory<T extends { role: "user" | "assistant"; content: string }>(messages: T[]) {
  const history: { role: "user" | "assistant"; content: string }[] = [];
  let remaining = MAX_CHAT_HISTORY;
  for (const message of messages.slice(-10).reverse()) {
    const content = message.content.trim().slice(0, MAX_CHAT_MESSAGE);
    if (!content) continue;
    if (content.length > remaining) break;
    history.unshift({ role: message.role, content });
    remaining -= content.length;
  }
  return history;
}
