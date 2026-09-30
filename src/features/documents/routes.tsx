import { lazy } from "react";
import type { RouteObject } from "react-router";

const Register = lazy(() => import("./pages/Register"));
const DocumentDetail = lazy(() => import("./pages/DocumentDetail"));
const Permits = lazy(() => import("./pages/Permits"));

const routes = [
  { path: "/documents", element: <Register /> },
  { path: "/documents/:docId", element: <DocumentDetail /> },
  { path: "/permits", element: <Permits /> },
] satisfies RouteObject[];

export default routes;
