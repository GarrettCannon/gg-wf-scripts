import { removeQueryParams, onQueryChanged } from "./query-params.js";

function stopLenis() {
  if (typeof lenis !== "undefined") lenis.stop();
}

function startLenis() {
  if (typeof lenis !== "undefined") lenis.start();
}

function openDialog() {
  const dialog = document.querySelector("dialog");
  if (!dialog) return;
  dialog.removeAttribute("aria-hidden");
  dialog.removeAttribute("inert");
  dialog.showModal();
  stopLenis();
}

function closeDialog() {
  const dialog = document.querySelector("dialog");
  if (!dialog) return;
  dialog.setAttribute("aria-hidden", "true");
  dialog.setAttribute("inert", "");
  dialog.close();
  startLenis();
}

function dismissViaUrlOrDirect() {
  const modalParam = new URLSearchParams(window.location.search).get("modal");
  if (modalParam) {
    removeQueryParams(["modal", "id"]);
  } else {
    closeDialog();
  }
}

function syncDialogToUrl() {
  const modalParam = new URLSearchParams(window.location.search).get("modal");
  if (modalParam) {
    openDialog();
  } else {
    closeDialog();
  }
}

export function initDialog() {
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
    if (!e.target.matches("dialog[open]")) return;
    const rect = e.target.getBoundingClientRect();
    const outside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;
    if (outside) dismissViaUrlOrDirect();
  });

  // Escape key — preempt the default close so the URL stays source of truth
  document.addEventListener("cancel", (e) => {
    if (!e.target.matches("dialog")) return;
    e.preventDefault();
    dismissViaUrlOrDirect();
  });

  // Back button
  window.addEventListener("popstate", syncDialogToUrl);

  // Initial load
  syncDialogToUrl();
}
