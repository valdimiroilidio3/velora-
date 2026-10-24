"use client";

import {
  Boxes,
  Compass,
  CreditCard,
  LayoutList,
  Mail,
  Move3d,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { isNavItemActive, navGroups, type NavIcon } from "@/config/nav";
import { cn } from "@/lib/cn";
import { usePathname } from "next/navigation";
import { usePreferences } from "@/lib/preferences-store";
import type { ReactNode } from "react";

const iconFor: Record<NavIcon, (props: { className?: string }) => ReactNode> = {
  overview: LayoutList,
  projects: Boxes,
  scene: Compass,
  editor: Move3d,
  preferences: Settings2,
  members: Users,
  leads: Mail,
  billing: CreditCard,
  ai: Sparkles,
};

export function AppNav({ onNavigate }: { readonly onNavigate?: () => void }): ReactNode {
  const pathname = usePathname();
  const { preferences } = usePreferences();
  const compact = preferences.density === "compact";

  return (
    <nav aria-label="Navegação principal" className="grid gap-6">
      {navGroups.map((group) => (
        <div key={group.label} className="grid gap-1.5">
          <p className="label-caps px-2 text-ink-muted">{group.label}</p>
          <ul className="grid gap-px">
            {group.items.map((item) => {
              const Icon = iconFor[item.icon];
              if (item.phase !== undefined) {
                return (
                  <li key={item.href}>
                    <span
                      aria-disabled="true"
                      title={item.hint}
                      className={cn(
                        "flex cursor-not-allowed items-center gap-2.5 rounded-md px-2 text-sm text-ink-muted",
                        compact ? "py-1.5" : "py-2",
                      )}
                    >
                      <Icon className="size-4 shrink-0 opacity-70" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      <span className="shrink-0 rounded-sm border border-dashed border-line-strong px-1.5 py-px text-2xs">
                        {item.phase}
                      </span>
                    </span>
                  </li>
                );
              }

              const active = isNavItemActive(item, pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-md px-2 text-sm transition-colors duration-150 ease-quart-out",
                      compact ? "py-1.5" : "py-2",
                      active
                        ? "bg-accent-soft font-medium text-accent-ink"
                        : "text-ink-secondary hover:bg-canvas-sunken hover:text-ink",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full transition-opacity duration-150",
                        active
                          ? "bg-accent opacity-100"
                          : "opacity-0 group-hover:opacity-40 group-hover:bg-ink-faint",
                      )}
                    />
                    <Icon className={cn("size-4 shrink-0", active ? "text-accent" : "text-ink-muted")} />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
