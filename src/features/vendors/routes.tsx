import { lazy } from "react";
import type { RouteObject } from "react-router";

const VendorsPage = lazy(() => import("./pages/VendorsPage"));
const VendorDetailPage = lazy(() => import("./pages/VendorDetailPage"));
const WarrantiesPage = lazy(() => import("./pages/WarrantiesPage"));

const routes = [
  { path: "/warranties", element: <WarrantiesPage /> },
  { path: "/vendors", element: <VendorsPage /> },
  { path: "/vendors/:vendorId", element: <VendorDetailPage /> },
] satisfies RouteObject[];

export default routes;
