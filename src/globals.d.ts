import type { App } from "./index.js";

export {};

declare global {
  // Injected by Webflow's hosted runtime on the page.
  const Webflow: {
    push(callback: () => void): void;
    require(module: "ix3"): { emit(event: string): void };
    require(module: string): unknown;
  };

  // Lenis smooth-scroll instance, attached as a global by the page setup.
  const lenis: {
    start(): void;
    stop(): void;
  };

  interface Window {
    ggApp?: App<unknown>;
  }

  interface DocumentEventMap {
    "gg-app-ready": CustomEvent<{ app: App<unknown> }>;
  }

  interface Element {
    __ggRecord?: Record<string, unknown>;
    __ggFormErrorBound?: boolean;
  }
}
