import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { FocusWindow } from "./components/FocusWindow";
import { PetWindow } from "./components/PetWindow";
import { isTauriRuntime } from "./lib/platform";

const searchParams = new URLSearchParams(window.location.search);
const legacyView = searchParams.get("view");
const route = window.location.hash.replace(/^#/, "");
const isPetView = route === "/pet" || legacyView === "pet";
const isFocusView = route === "/focus" || legacyView === "focus";

if (isPetView || isFocusView) {
  document.documentElement.classList.add("widget-view");
  document.documentElement.classList.add(isPetView ? "pet-view" : "focus-view");
  document.documentElement.classList.add(
    isTauriRuntime() ? "desktop-widget" : "web-widget-preview",
  );
}

const RootComponent = isPetView ? PetWindow : isFocusView ? FocusWindow : App;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>,
);
