import { use } from "react";
import { useRoutes } from "react-router";
import routes from "@/app/router";
import { storeReady } from "@/data/store";

export default function App() {
  use(storeReady); // suspends (main.tsx shows Loading) until the seed chunk has loaded
  return useRoutes(routes);
}
