import Link from "next/link";
import { cx } from "./ui";

export function StatusTabs({ base, current, tabs }: { base: string; current: string; tabs: [string, string][] }) {
  return (
    <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 scrollbar-none">
      {tabs.map(([v, l]) => (
        <Link key={v} href={v ? `${base}?status=${v}` : base} className={cx("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium", current === v ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white")}>{l}</Link>
      ))}
    </div>
  );
}
