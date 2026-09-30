import { RotateCcw } from "lucide-react";
import { resetDemo } from "@/data/store";

export function ResetDemo() {
  return (
    <button
      type="button"
      onClick={() => {
        if (window.confirm("Reset demo data? Everything you added or changed in this browser will be removed and the sample data restored.")) resetDemo();
      }}
      className="focus-ring flex h-10 w-full items-center gap-3 rounded-ctl px-3 text-[12px] font-extrabold uppercase tracking-[.08em] text-nav-muted transition-colors duration-150 hover:bg-navy-hover hover:text-nav-text"
    >
      <RotateCcw className="size-[18px] shrink-0" strokeWidth={2} />
      Reset demo data
    </button>
  );
}
