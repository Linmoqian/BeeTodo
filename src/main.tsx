import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { FocusWindow } from "./components/FocusWindow";
import { PetWindow } from "./components/PetWindow";
import { PinControlWindow } from "./components/PinControlWindow";
import { isTauriRuntime } from "./lib/platform";

const QuickNoteWindow = lazy(async () => {
  const module = await import("./components/QuickNoteWindow");
  return { default: module.QuickNoteWindow };
});

const NoteTileWindow = lazy(async () => {
  const module = await import("./components/NoteTileWindow");
  return { default: module.NoteTileWindow };
});

const searchParams = new URLSearchParams(window.location.search);
const legacyView = searchParams.get("view");
const route = window.location.hash.replace(/^#/, "");
const isPetView = route === "/pet" || legacyView === "pet";
const isFocusView = route === "/focus" || legacyView === "focus";
const isQuickNoteView = route === "/quick-note" || legacyView === "quick-note";
const isPinControlView = route === "/pin-control";
const noteTileMatch = route.match(/^\/note-tile\/(.+)$/);
const noteTileId = noteTileMatch ? decodeURIComponent(noteTileMatch[1]) : null;
const widgetViewClass = isPetView
  ? "pet-view"
  : isFocusView
    ? "focus-view"
    : isQuickNoteView
      ? "quick-note-view"
      : isPinControlView
        ? "pin-control-view"
        : "note-tile-view";

if (isTauriRuntime()) {
  window.addEventListener(
    "contextmenu",
    (event) => event.preventDefault(),
    { capture: true },
  );
}

if (isPetView || isFocusView || isQuickNoteView || isPinControlView || noteTileId) {
  document.documentElement.classList.add("widget-view");
  document.documentElement.classList.add(widgetViewClass);
  document.documentElement.classList.add(
    isTauriRuntime() ? "desktop-widget" : "web-widget-preview",
  );
} else if (isTauriRuntime()) {
  document.documentElement.classList.add("desktop-main");
}

const rootElement = isPetView ? (
  <PetWindow />
) : isFocusView ? (
  <FocusWindow />
) : isQuickNoteView ? (
  <Suspense fallback={null}><QuickNoteWindow /></Suspense>
) : isPinControlView ? (
  <PinControlWindow />
) : noteTileId ? (
  <Suspense fallback={null}><NoteTileWindow noteId={noteTileId} /></Suspense>
) : (
  <App />
);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {rootElement}
  </React.StrictMode>,
);
