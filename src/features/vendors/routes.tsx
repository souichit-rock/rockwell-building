import { Hammer } from "lucide-react";
import type { RouteObject } from "react-router";
import { EmptyState } from "@/components/ui";

const soon = (body: string) => <EmptyState icon={Hammer} title="Coming up" body={body} />;

const routes = [
  { path: "/warranties", element: soon("Warranty register") },
  { path: "/vendors", element: soon("Vendors & contacts") },
  { path: "/vendors/:vendorId", element: soon("Vendor") },
] satisfies RouteObject[];

export default routes;
