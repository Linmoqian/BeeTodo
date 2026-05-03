import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PetWindow } from "./components/PetWindow";

const searchParams = new URLSearchParams(window.location.search);
const isPetView = searchParams.get("view") === "pet";
if (isPetView) {
  document.documentElement.classList.add("pet-view");
}

const RootComponent = isPetView ? PetWindow : App;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>,
);
