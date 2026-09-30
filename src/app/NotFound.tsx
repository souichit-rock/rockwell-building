import { SearchX } from "lucide-react";
import { Link } from "react-router";
import { EmptyState } from "@/components/ui";
import { paths } from "@/lib/paths";

// ponytail: the ghost / sm Button recipe (design-system §4.3) is inlined because F0 has no Button yet; swap to <Button to=… variant="ghost" size="sm"> once F1-b lands.
const ghostSm =
  "focus-ring inline-flex h-8 items-center justify-center gap-2 rounded-ctl border border-line-strong bg-surface px-3 text-[11px] font-extrabold uppercase tracking-[.07em] whitespace-nowrap text-ink transition-colors duration-150 hover:border-ink-soft";

export function NotFound({ what, id }: { what?: string; id?: string }) {
  const body = what && id ? `No ${what} matches "${id}".` : what ? `No such ${what}.` : "This page does not exist.";
  return (
    <EmptyState
      icon={SearchX}
      title="Not found"
      body={body}
      action={<Link to={paths.home()} className={ghostSm}>Back to dashboard</Link>}
    />
  );
}

export default NotFound;
