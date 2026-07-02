"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNavigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation">
      <div className="flex gap-2 overflow-x-auto rounded-xl border border-border bg-card/80 p-1 shadow-[0_4px_20px_rgba(45,79,60,0.05)] md:w-fit md:flex-wrap">
        {mainNavigation.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold text-muted-foreground",
                "hover:bg-muted hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                active && "bg-secondary text-primary shadow-sm"
              )}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
