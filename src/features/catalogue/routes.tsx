import { Hammer } from "lucide-react";
import type { RouteObject } from "react-router";
import { EmptyState } from "@/components/ui";

const soon = (body: string) => <EmptyState icon={Hammer} title="Coming up" body={body} />;

const routes = [
  { path: "/catalogue", element: soon("Brands & models") },
  { path: "/catalogue/brands/:brandId", element: soon("Brand") },
  { path: "/catalogue/models/:modelId", element: soon("Model spec sheet") },
] satisfies RouteObject[];

export default routes;
