import { Mail, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Button, Card, KV } from "@/components/ui";
import type { Floor, TeamMember, Tower } from "@/data/types";
import { fmtNumber, fmtSqm } from "@/lib/format";
import { paths } from "@/lib/paths";
import { levelRange, telHref, USE_LABEL } from "../lib";

/** One person or office: name, role, the dialable number and address in text, and call / e-mail buttons. */
function ContactRow({ name, role, phone, email }: { name: string; role: string; phone: string; email: string }) {
  return (
    <li className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-bold text-ink">{name}</p>
        <p className="type-small text-ink-soft">{role}</p>
        <p className="mt-0.5 text-xs text-muted">{phone}</p>
        <p className="break-all text-xs text-muted">{email}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button to={telHref(phone)} variant="ghost" size="sm" icon aria-label={`Call ${name}`}>
          <Phone aria-hidden="true" className="size-4" strokeWidth={2} />
        </Button>
        <Button to={`mailto:${email}`} variant="ghost" size="sm" icon aria-label={`E-mail ${name}`}>
          <Mail aria-hidden="true" className="size-4" strokeWidth={2} />
        </Button>
      </div>
    </li>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-5 border-t border-line pt-4">
      <h3 className="type-eyebrow mb-3">{title}</h3>
      <ul>{children}</ul>
    </div>
  );
}

/** Tower facts plus the people to call: property manager, the tower's PMO, and everyone whose teamMembers.towerIds include it. */
export function FactsCard({ tower, floors, assetCount, manager, contacts }: {
  tower: Tower; floors: Floor[]; assetCount: number; manager?: TeamMember; contacts: TeamMember[];
}) {
  return (
    <Card title="Facts">
      <KV
        items={[
          { k: "Estate", v: tower.estate },
          { k: "Address", v: tower.address },
          { k: "Use", v: USE_LABEL[tower.use] },
          { k: "Levels", v: `${levelRange(floors)} · ${fmtNumber(tower.floorsAbove)} above, ${fmtNumber(tower.floorsBelow)} below` },
          { k: "GFA", v: fmtSqm(tower.gfaSqm) },
          { k: "Turnover", v: String(tower.turnoverYear) },
          { k: "Assets", v: <Link to={paths.assets({ tower: tower.id })} className="focus-ring rounded hover:underline">{fmtNumber(assetCount)}</Link> },
        ]}
      />
      {manager && (
        <Group title="Property manager">
          <ContactRow name={manager.name} role={manager.role} phone={manager.phone} email={manager.email} />
        </Group>
      )}
      <Group title="PMO">
        <ContactRow name={`${tower.name} PMO`} role="Property management office" phone={tower.pmoPhone} email={tower.pmoEmail} />
      </Group>
      {contacts.length > 0 && (
        <Group title="Team contacts">
          {contacts.map((m) => <ContactRow key={m.id} name={m.name} role={`${m.role} · ${m.team}`} phone={m.phone} email={m.email} />)}
        </Group>
      )}
    </Card>
  );
}
