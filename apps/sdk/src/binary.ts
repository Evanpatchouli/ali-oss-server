import type { BinaryInput } from "./types.js";

export function toArrayBuffer(input: BinaryInput): ArrayBuffer {
  if (input instanceof ArrayBuffer) {
    return input.slice(0);
  }

  const view = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  const copied = new Uint8Array(view.byteLength);
  copied.set(view);
  return copied.buffer;
}

export function byteLength(input: BinaryInput): number {
  return input instanceof ArrayBuffer ? input.byteLength : input.byteLength;
}
