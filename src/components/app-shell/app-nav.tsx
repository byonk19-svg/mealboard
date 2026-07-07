"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNavigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation">
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-border/80 bg-card/88 p-1 shadow-[0_10px_28px_rgba(22,48,32,0.07)] md:w-fit md:flex-wrap">
        {mainNavigation.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center whitespace-nowrap rounded-xl px-4 py-2 text-sm font-extrabold text-muted-foreground",
                "hover:bg-muted hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                active && "bg-secondary text-primary shadow-[inset_0_0_0_1px_rgba(73,101,81,0.12)]"
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
