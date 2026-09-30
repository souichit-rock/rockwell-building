import { Printer } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { paths } from "@/lib/paths";
import { qrPlaceholderCells } from "@/lib/qr";

/** The 25 x 25 pattern is decorative (lib/qr.ts) and the caption says so. One path holds every dark module, on a 2-module quiet zone. */
export function QrCard({ tag }: { tag: string }) {
  const d = qrPlaceholderCells(tag)
    .flatMap((row, y) => row.map((dark, x) => (dark ? `M${x + 2} ${y + 2}h1v1h-1z` : "")))
    .join("");
  return (
    <Card title="QR label" className="print:mb-3 print:break-inside-avoid">
      <div className="flex flex-col items-center gap-3 text-center">
        <svg
          viewBox="0 0 29 29" role="img" aria-label={`Placeholder QR pattern for ${tag}`} shapeRendering="crispEdges"
          className="size-[174px] rounded-ctl border border-line print:size-[116px]"
        >
          <rect width={29} height={29} className="fill-surface" />
          <path d={d} className="fill-ink" />
        </svg>
        <p className="type-small text-muted">{`Placeholder — encodes ${paths.qr(tag)}`}</p>
        <Button variant="ghost" size="sm" className="print:hidden" onClick={() => window.print()}>
          <Printer aria-hidden="true" className="size-4" strokeWidth={2} />
          Print label
        </Button>
      </div>
    </Card>
  );
}
