import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { PenyimpananLokal } from "./domain/persistence/PenyimpananLokal";
import { CloudSync } from "./domain/sync/CloudSync";
import "./styles/index.css";

PenyimpananLokal.init().then(() => {
  CloudSync.aktifkanAutoBackup();
  createRoot(document.getElementById("root")!).render(<App />);
});
