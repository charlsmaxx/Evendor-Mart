import type { DomainEvent, DomainEventType } from "./types";
import { registerDomainEventHandlers } from "./register-handlers";

type DomainEventHandler = (event: DomainEvent) => void | Promise<void>;

const handlers = new Map<DomainEventType, DomainEventHandler[]>();
let handlersRegistered = false;

function ensureHandlersRegistered(): void {
  if (handlersRegistered) return;
  handlersRegistered = true;
  registerDomainEventHandlers();
}

export function onDomainEvent(type: DomainEventType, handler: DomainEventHandler): void {
  const list = handlers.get(type) ?? [];
  list.push(handler);
  handlers.set(type, list);
}

export async function emitDomainEvent(
  event: Omit<DomainEvent, "occurredAt">
): Promise<void> {
  ensureHandlersRegistered();
  const full: DomainEvent = { ...event, occurredAt: new Date() };
  for (const handler of handlers.get(event.type) ?? []) {
    try {
      await handler(full);
    } catch (error) {
      console.error(`[DomainEvent ${event.type}]`, error);
    }
  }
}
