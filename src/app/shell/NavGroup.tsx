import { NavItem, type NavItemProps } from "@/app/shell/NavItem";

export interface NavGroupProps {
  label: string;
  items: NavItemProps[];
}

export function NavGroup({ label, items }: NavGroupProps) {
  return (
    <div className="mt-5 first:mt-1">
      <p className="type-eyebrow mb-2 px-3 text-nav-muted/70">{label}</p>
      <div className="space-y-0.5">
        {items.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </div>
    </div>
  );
}
