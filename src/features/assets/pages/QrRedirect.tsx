import { Navigate, useParams } from "react-router";
import NotFound from "@/app/NotFound";
import { useDb } from "@/data/store";
import { paths } from "@/lib/paths";

/** /a/:tag, the address a printed QR label carries. The tag is matched without regard to case. */
export default function QrRedirect() {
  const tag = (useParams().tag ?? "").trim();
  const asset = useDb((db) => Object.values(db.assets).find((a) => a.tag.toLowerCase() === tag.toLowerCase()));
  return asset ? <Navigate replace to={paths.asset(asset.id)} /> : <NotFound what="asset tag" id={tag} />;
}
