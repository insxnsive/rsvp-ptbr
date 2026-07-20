import { render } from "preact";
import App from "./App.js";
import "./styles.css";

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled rejection:", event.reason);
});

const root = document.getElementById("app");
if (!root) {
  throw new Error("App root not found");
}

render(<App />, root);
