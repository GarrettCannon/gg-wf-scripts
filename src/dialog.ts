import { removeQueryParams, onQueryChanged } from "./query-params.js";

function stopLenis(): void {
  if (typeof lenis !== "undefined") lenis.stop();
}

function startLenis(): void {
  if (typeof lenis !== "undefined") lenis.start();
}

function openDialog(): void {
  const dialog = document.querySelector("dialog");
  if (!dialog) return;
  dialog.removeAttribute("aria-hidden");
  dialog.removeAttribute("inert");
  dialog.showModal();
  stopLenis();
}

function closeDialog(): void {
  const dialog = document.querySelector("dialog");
  if (!dialog) return;
  dialog.setAttribute("aria-hidden", "true");
  dialog.setAttribute("inert", "");
  dialog.close();
  startLenis();
}

function dismissViaUrlOrDirect(): void {
  const modalParam = new URLSearchParams(window.location.search).get("modal");
  if (modalParam) {
    removeQueryParams(["modal", "id"]);
  } else {
    closeDialog();
  }
}

function syncDialogToUrl(): void {
  const modalParam = new URLSearchParams(window.location.search).get("modal");
  if (modalParam) {
    openDialog();
  } else {
    closeDialog();
  }
}

export function initDialog(): () => void {
  const unsubscribe = onQueryChanged((key, value) => {
    if (key !== "modal") return;
    if (value) {
      openDialog();
    } else {
      closeDialog();
    }
  });

  document.addEventListener("gg:dialog:open", openDialog);
  document.addEventListener("gg:dialog:close", closeDialog);

  const onClick = (e: MouseEvent) => {
    const target = e.target;
    if (!(target instanceof HTMLDialogElement)) return;
    if (!target.matches("dialog[open]")) return;
    const rect = target.getBoundingClientRect();
    const outside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;
    if (outside) dismissViaUrlOrDirect();
  };
  document.addEventListener("click", onClick);

  const onCancel = (e: Event) => {
    const target = e.target;
    if (!(target instanceof HTMLDialogElement)) return;
    e.preventDefault();
    dismissViaUrlOrDirect();
  };
  document.addEventListener("cancel", onCancel);

  window.addEventListener("popstate", syncDialogToUrl);

  syncDialogToUrl();

  return () => {
    unsubscribe();
    document.removeEventListener("gg:dialog:open", openDialog);
    document.removeEventListener("gg:dialog:close", closeDialog);
    document.removeEventListener("click", onClick);
    document.removeEventListener("cancel", onCancel);
    window.removeEventListener("popstate", syncDialogToUrl);
  };
}
