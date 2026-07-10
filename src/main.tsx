import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { PenyimpananLokal } from "./domain/persistence/PenyimpananLokal";
import "./styles/index.css";

PenyimpananLokal.init().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
