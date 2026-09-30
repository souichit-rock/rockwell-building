import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "@/app/App";
import { Loading } from "@/components/ui";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<div className="grid min-h-dvh place-items-center"><Loading label="Loading building data" /></div>}>
        <App />
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
);
