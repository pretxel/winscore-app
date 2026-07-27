// Polyfill DisposableStack for browsers that don't support it yet
// (Safari < 18.4, Chrome < 125, Firefox < 131).
// Next.js 16 / Turbopack may emit `using` statements that compile to
// DisposableStack references.

if (typeof SuppressedError === "undefined") {
  class SuppressedErrorImpl extends Error {
    error: unknown;
    suppressed: unknown;

    constructor(error: unknown, suppressed: unknown, message?: string) {
      super(message ?? String(error));
      this.name = "SuppressedError";
      this.error = error;
      this.suppressed = suppressed;
    }
  }

  (globalThis as Record<string, unknown>).SuppressedError = SuppressedErrorImpl;
}

if (typeof globalThis.DisposableStack === "undefined") {
  class DisposableStackImpl {
    #disposed = false;
    #onDispose: Array<{ value: unknown; onDispose: (value: unknown) => void }> = [];
    #onDisposeAsync: Array<{
      value: unknown;
      onDisposeAsync: (value: unknown) => Promise<void>;
    }> = [];

    get disposed(): boolean {
      return this.#disposed;
    }

    use<T extends Disposable | null | undefined>(value: T): T {
      if (this.#disposed) throw new ReferenceError("DisposableStack is already disposed");
      if (value !== null && value !== undefined) {
        this.#onDispose.push({ value, onDispose: (v) => (v as Disposable)[Symbol.dispose]() });
      }
      return value;
    }

    defer(onDispose: () => void): void {
      if (this.#disposed) throw new ReferenceError("DisposableStack is already disposed");
      this.#onDispose.push({ value: undefined, onDispose });
    }

    adopt<T>(value: T, onDispose: (value: T) => void): T {
      if (this.#disposed) throw new ReferenceError("DisposableStack is already disposed");
      this.#onDispose.push({ value, onDispose: onDispose as (value: unknown) => void });
      return value;
    }

    move(): DisposableStack {
      if (this.#disposed) throw new ReferenceError("DisposableStack is already disposed");
      const stack = new DisposableStackImpl();
      // Transfer all deferred dispose callbacks
      for (const entry of this.#onDispose) {
        stack.#onDispose.push(entry);
      }
      for (const entry of this.#onDisposeAsync) {
        stack.#onDisposeAsync.push(entry);
      }
      this.#onDispose = [];
      this.#onDisposeAsync = [];
      this.#disposed = true;
      return stack;
    }

    get [Symbol.toStringTag](): string {
      return "DisposableStack";
    }

    dispose(): void {
      this[Symbol.dispose]();
    }

    [Symbol.dispose](): void {
      if (this.#disposed) return;
      this.#disposed = true;
      const errors: Error[] = [];
      for (const { value, onDispose } of this.#onDispose.reverse()) {
        try {
          onDispose(value);
        } catch (err) {
          errors.push(err instanceof Error ? err : new Error(String(err)));
        }
      }
      // Async disposables: we can't await here, so fire-and-forget with error suppression
      for (const { value, onDisposeAsync } of this.#onDisposeAsync.reverse()) {
        onDisposeAsync(value).catch(() => {});
      }
      if (errors.length > 0) {
        throw new SuppressedError(errors[errors.length - 1], undefined, String(errors));
      }
    }
  }

  globalThis.DisposableStack = DisposableStackImpl as typeof DisposableStack;
}
