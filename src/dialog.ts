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

export function initDialog(): void {
  // Subscribe to query param changes — open/close when "modal" changes
  onQueryChanged((key, value) => {
    if (key !== "modal") return;
    if (value) {
      openDialog();
    } else {
      closeDialog();
    }
  });

  // Inbound events from external code
  document.addEventListener("gg:dialog:open", openDialog);
  document.addEventListener("gg:dialog:close", closeDialog);

  // Backdrop click
  document.addEventListener("click", (e) => {
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
  });

  // Escape key — preempt the default close so the URL stays source of truth
  document.addEventListener("cancel", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLDialogElement)) return;
    e.preventDefault();
    dismissViaUrlOrDirect();
  });

  // Back button
  window.addEventListener("popstate", syncDialogToUrl);

  // Initial load
  syncDialogToUrl();
}
