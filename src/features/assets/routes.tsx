import { lazy } from "react";
import type { RouteObject } from "react-router";

const AssetRegistry = lazy(() => import("./pages/AssetRegistry"));
const AssetPassport = lazy(() => import("./pages/AssetPassport"));
const QrRedirect = lazy(() => import("./pages/QrRedirect"));

const routes = [
  { path: "/assets", element: <AssetRegistry /> },
  { path: "/assets/:assetId", element: <AssetPassport /> },
  { path: "/a/:tag", element: <QrRedirect /> },
] satisfies RouteObject[];

export default routes;
