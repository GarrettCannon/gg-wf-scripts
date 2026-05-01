type ElementHandler = (el: Element) => void;
type Subscription = { selector: string; handler: ElementHandler };

/**
 * Shared MutationObserver. Engines call `onElement(selector, handler)` to be
 * notified when a matching element is present at start time **or** later
 * inserted into the DOM (Webflow IX, CMS templates, custom elements). One
 * observer for the whole library — not one per engine.
 *
 * `start()` returns the global teardown; `onElement()` returns a per-handler
 * teardown so engines can clean up their own subscriptions in dispose().
 */

const subscriptions: Subscription[] = [];
let observer: MutationObserver | null = null;

export function onElement(
  selector: string,
  handler: ElementHandler,
): () => void {
  const sub: Subscription = { selector, handler };
  subscriptions.push(sub);
  document.querySelectorAll(selector).forEach(handler);
  return () => {
    const idx = subscriptions.indexOf(sub);
    if (idx >= 0) subscriptions.splice(idx, 1);
  };
}

export function startDomObserver(): () => void {
  if (observer) return () => {};
  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        for (const sub of subscriptions) {
          if (node.matches(sub.selector)) sub.handler(node);
          node
            .querySelectorAll(sub.selector)
            .forEach((el) => sub.handler(el));
        }
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return () => {
    observer?.disconnect();
    observer = null;
    subscriptions.length = 0;
  };
}
