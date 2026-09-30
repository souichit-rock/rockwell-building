import { lazy } from "react";
import type { RouteObject } from "react-router";

const CataloguePage = lazy(() => import("./pages/CataloguePage"));
const BrandPage = lazy(() => import("./pages/BrandPage"));
const ModelPage = lazy(() => import("./pages/ModelPage"));

const routes = [
  { path: "/catalogue", element: <CataloguePage /> },
  { path: "/catalogue/brands/:brandId", element: <BrandPage /> },
  { path: "/catalogue/models/:modelId", element: <ModelPage /> },
] satisfies RouteObject[];

export default routes;
