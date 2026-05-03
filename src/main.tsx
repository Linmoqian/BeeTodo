import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PetWindow } from "./components/PetWindow";

const searchParams = new URLSearchParams(window.location.search);
const RootComponent = searchParams.get("view") === "pet" ? PetWindow : App;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>,
);
