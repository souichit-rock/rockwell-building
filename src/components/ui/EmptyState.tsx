import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";

/** design-system §4.10. `action` is normally a Button variant="ghost" size="sm". */
export function EmptyState({ icon: Icon, title, body, action, className, as: Title = "p" }: {
  icon: LucideIcon;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** Element for the title: "h1" when the empty state is the whole page (a 404), otherwise the default paragraph. */
  as?: "p" | "h1" | "h2" | "h3";
}) {
  return (
    <div className={cn("rounded-card border-2 border-dashed border-line-strong bg-surface-2 px-4 py-10 text-center", className)}>
      <Icon className="mx-auto size-8 text-muted" strokeWidth={2} />
      <Title className="type-heading mt-3 text-ink">{title}</Title>
      {body && <p className="type-small mt-1 text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
