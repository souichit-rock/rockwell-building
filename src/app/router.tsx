import type { RouteObject } from "react-router";
import { ErrorFallback } from "@/app/ErrorBoundary";
import NotFound from "@/app/NotFound";
import Shell from "@/app/Shell";
import assetsRoutes from "@/features/assets/routes";
import catalogueRoutes from "@/features/catalogue/routes";
import dashboardRoutes from "@/features/dashboard/routes";
import documentsRoutes from "@/features/documents/routes";
import floorplansRoutes from "@/features/floorplans/routes";
import maintenanceRoutes from "@/features/maintenance/routes";
import standardsRoutes from "@/features/standards/routes";
import towersRoutes from "@/features/towers/routes";
import vendorsRoutes from "@/features/vendors/routes";
import workOrdersRoutes from "@/features/work-orders/routes";

export const routes: RouteObject[] = [
  {
    element: <Shell />,
    // Only a data router (createBrowserRouter) reads errorElement; App renders these routes through useRoutes, where the ErrorBoundary
    // in Shell and main.tsx does the catching. Kept so the layout route is covered whichever router is used.
    errorElement: <ErrorFallback fullPage />,
    children: [
      ...dashboardRoutes,
      ...towersRoutes,
      ...floorplansRoutes,
      ...assetsRoutes,
      ...standardsRoutes,
      ...catalogueRoutes,
      ...documentsRoutes,
      ...maintenanceRoutes,
      ...workOrdersRoutes,
      ...vendorsRoutes,
      { path: "*", element: <NotFound /> },
    ],
  },
];

export default routes;
