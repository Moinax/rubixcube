import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { lang, tr } from "./i18n";
import "./index.css";

document.documentElement.lang = lang;
document.title = tr({
  fr: "Cubiste : résous ton Rubik's Cube",
  nl: "Cubiste: los je Rubik's Cube op",
  en: "Cubiste: solve your Rubik's Cube",
});

// Every screen fills the height, its own top bar (back, tools, languages) first.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="flex min-h-dvh flex-col">
      <App />
    </div>
  </StrictMode>,
);
