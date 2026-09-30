import { Building2 } from "lucide-react";
import { Link } from "react-router";
import { paths } from "@/lib/paths";

export function Brand() {
  return (
    <Link to={paths.home()} aria-label="Rockwell Building, dashboard" className="focus-ring relative flex min-w-0 items-center gap-2.5 rounded-ctl after:absolute after:inset-x-0 after:-inset-y-2 after:content-['']">
      <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-gold text-on-gold">
        <Building2 className="size-4" strokeWidth={2} />
      </span>
      <span className="text-[14px] font-black leading-[1.15] tracking-[.11em] text-nav-text">
        ROCKWELL <span className="text-gold">BUILDING</span>
      </span>
    </Link>
  );
}
