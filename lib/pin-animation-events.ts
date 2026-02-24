export interface FlyingPinEvent {
  sourceRect: DOMRect;
}

type Listener = (event: FlyingPinEvent) => void;

let listeners: Listener[] = [];

export function onFlyingPin(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function emitFlyingPin(event: FlyingPinEvent): void {
  listeners.forEach((l) => l(event));
}
