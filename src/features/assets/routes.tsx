import { Hammer } from "lucide-react";
import type { RouteObject } from "react-router";
import { EmptyState } from "@/components/ui";

const soon = (body: string) => <EmptyState icon={Hammer} title="Coming up" body={body} />;

const routes = [
  { path: "/assets", element: soon("Asset registry") },
  { path: "/assets/:assetId", element: soon("Asset passport") },
  { path: "/a/:tag", element: soon("QR short link") },
] satisfies RouteObject[];

export default routes;
