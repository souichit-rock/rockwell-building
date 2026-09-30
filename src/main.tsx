import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "@/app/App";
import { ErrorBoundary } from "@/app/ErrorBoundary";
import { Loading } from "@/components/ui";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      {/* outermost net: a failed seed import (storeReady) or a crash in the shell itself lands here; page crashes are caught inside Shell */}
      <ErrorBoundary fullPage>
        <Suspense fallback={<div className="grid min-h-dvh place-items-center"><Loading label="Loading building data" /></div>}>
          <App />
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);
