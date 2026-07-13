import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { LocalStore } from "./domain/persistence/LocalStore";
import { CloudSync } from "./domain/sync/CloudSync";
import "./styles/index.css";

LocalStore.init().then(() => {
  CloudSync.enableAutoBackup();
  createRoot(document.getElementById("root")!).render(<App />);
});
