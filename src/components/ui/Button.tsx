import type { ComponentProps, ReactNode } from "react";
import { Link } from "react-router";
import { cn } from "./cn";

type Variant = "primary" | "ghost" | "navy" | "danger";
type Size = "md" | "sm";
type Own = { variant?: Variant; size?: Size; icon?: boolean; className?: string; children?: ReactNode };
type AsLink = Own & { to: string } & Omit<ComponentProps<typeof Link>, keyof Own | "to">;
type AsButton = Own & { to?: undefined } & Omit<ComponentProps<"button">, keyof Own>;
export type ButtonProps = AsLink | AsButton;

const BASE =
  "focus-ring inline-flex items-center justify-center gap-2 rounded-ctl border font-extrabold uppercase whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";

// sm is 32px tall by recipe; the ::after grows the 30px padding box plus 1px borders to a 40px hit area without moving anything (design-system §6: 40px tap targets)
const SIZE: Record<Size, { text: string; box: string; icon: string }> = {
  md: { text: "h-10 text-[12px] tracking-[.09em]", box: "px-4", icon: "w-10" },
  sm: { text: "relative h-8 text-[11px] tracking-[.07em] after:absolute after:-inset-[5px] after:content-['']", box: "px-3", icon: "w-8" },
};

// text-surface (white on light, navy on dark) keeps solid red readable in both themes; the recipe's text-white fails contrast on the dark danger token
const VARIANT: Record<Variant, string> = {
  primary: "border-gold bg-gold text-on-gold hover:border-gold-hover hover:bg-gold-hover",
  ghost: "border-line-strong bg-surface text-ink hover:border-ink-soft",
  navy: "border-navy bg-navy text-nav-text hover:bg-navy-hover",
  danger: "border-danger bg-danger text-surface hover:opacity-90",
};

const classes = (variant: Variant, size: Size, icon: boolean | undefined, className?: string) =>
  cn(BASE, SIZE[size].text, icon ? SIZE[size].icon : SIZE[size].box, VARIANT[variant], className);

/** design-system §4.3. `to` renders a router Link with the same classes; otherwise a native button. */
export function Button(props: ButtonProps) {
  if (props.to !== undefined) {
    const { variant = "ghost", size = "md", icon, className, ...link } = props;
    return <Link {...link} className={classes(variant, size, icon, className)} />;
  }
  const { variant = "ghost", size = "md", icon, className, ...button } = props;
  return <button {...button} className={classes(variant, size, icon, className)} />;
}
