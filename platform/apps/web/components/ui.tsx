/** Komponen UI dasar Shopia (dapat dipakai di Server & Client Component). */
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { rupiah } from "@/lib/format";
import { IconStar } from "./icons";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const BUTTON = {
  // Aksi utama: pil lime dengan teks gelap (kontras tinggi)
  primary: "bg-lime-300 text-ink hover:bg-lime-400 shadow-glow ring-1 ring-inset ring-lime-500/30",
  brand: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/25",
  secondary: "bg-brand-50 text-brand-800 hover:bg-brand-100",
  outline: "border border-line bg-white text-ink hover:border-brand-300 hover:bg-brand-50/50",
  ghost: "text-ink hover:bg-brand-50",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
  dark: "bg-ink text-white hover:bg-brand-950",
  ai: "bg-leafy text-white shadow-md shadow-leaf-500/30 hover:brightness-105",
};
const SIZE = { sm: "h-9 px-3.5 text-sm gap-1.5", md: "h-11 px-5 text-sm gap-2", lg: "h-13 px-7 text-base gap-2" };

type ButtonStyle = { variant?: keyof typeof BUTTON; size?: keyof typeof SIZE; block?: boolean };
export const buttonClass = ({ variant = "primary", size = "md", block }: ButtonStyle = {}) =>
  cx(
    "inline-flex items-center justify-center rounded-full font-bold transition active:scale-[.98] disabled:pointer-events-none disabled:opacity-50 select-none",
    BUTTON[variant],
    SIZE[size],
    block && "w-full",
  );

export function Button({ variant, size, block, className, ...rest }: ComponentProps<"button"> & ButtonStyle) {
  return <button className={cx(buttonClass({ variant, size, block }), className)} {...rest} />;
}

export function ButtonLink({ variant, size, block, className, ...rest }: ComponentProps<typeof Link> & ButtonStyle) {
  return <Link className={cx(buttonClass({ variant, size, block }), className)} {...rest} />;
}

const TONES = {
  gray: "bg-slate-100 text-slate-700",
  brand: "bg-brand-50 text-brand-700 ring-1 ring-brand-100",
  lime: "bg-lime-200 text-ink ring-1 ring-lime-400/50",
  leaf: "bg-leaf-50 text-leaf-700 ring-1 ring-leaf-100",
  amber: "bg-amber-50 text-amber-800 ring-1 ring-amber-100",
  red: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
  blue: "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
};
export function Badge({ tone = "gray", className, children }: { tone?: keyof typeof TONES; className?: string; children: ReactNode }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", TONES[tone], className)}>{children}</span>;
}

export function Card({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cx("rounded-3xl border border-line/70 bg-white shadow-soft", className)} {...rest} />;
}

export function Label({ children, hint, className }: { children: ReactNode; hint?: string; className?: string }) {
  return (
    <span className={cx("mb-1.5 flex items-baseline justify-between text-sm font-semibold text-ink", className)}>
      {children}
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
    </span>
  );
}

const FIELD = "w-full rounded-2xl border border-line bg-white px-3.5 text-[15px] text-ink placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 disabled:bg-slate-50";
export const Input = ({ className, ...rest }: ComponentProps<"input">) => <input className={cx(FIELD, "h-11", className)} {...rest} />;
export const Textarea = ({ className, ...rest }: ComponentProps<"textarea">) => <textarea className={cx(FIELD, "py-2.5", className)} {...rest} />;
export const Select = ({ className, ...rest }: ComponentProps<"select">) => <select className={cx(FIELD, "h-11 pr-8", className)} {...rest} />;

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} />;
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center animate-fade-in">
      <div className="mb-4 grid size-16 place-items-center rounded-full bg-brand-50 text-brand-600 ring-8 ring-brand-50/50">{icon}</div>
      <h3 className="text-lg font-bold">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorBox({ title = "Terjadi kesalahan", text, action }: { title?: string; text: string; action?: ReactNode }) {
  return (
    <div role="alert" className="rounded-3xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800">
      <p className="font-semibold">{title}</p>
      <p className="mt-0.5">{text}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Price({ price, compareAt, size = "md", from }: { price: number; compareAt?: number | null; size?: "sm" | "md" | "lg"; from?: boolean }) {
  const valid = compareAt && compareAt > price ? compareAt : null;
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className={cx("tracking-tight text-ink", size === "lg" ? "text-[34px] font-bold leading-none" : size === "md" ? "text-base font-extrabold" : "text-[15px] font-extrabold")}>
        {from && <span className="mr-0.5 text-xs font-medium text-muted">mulai</span>}
        {rupiah(price)}
      </span>
      {valid && (
        <>
          <span className={cx("text-muted line-through", size === "lg" ? "text-base" : "text-xs")}>{rupiah(valid)}</span>
          <span className={cx("rounded-full font-extrabold", size === "lg" ? "bg-lime-300 px-2 py-0.5 text-sm text-ink" : "text-xs text-rose-600")}>-{Math.round((1 - price / valid) * 100)}%</span>
        </>
      )}
    </div>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex" aria-label={`Rating ${value} dari 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <IconStar key={i} size={size} className={i <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-slate-300"} />
      ))}
    </span>
  );
}

export function SectionHeader({ title, subtitle, href, linkText = "Lihat semua", icon }: { title: string; subtitle?: string; href?: string; linkText?: string; icon?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
          {icon}
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="shrink-0 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-brand-700 ring-1 ring-line hover:bg-brand-50">
          {linkText}
        </Link>
      )}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cx("inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)} aria-hidden="true" />;
}

/** Gambar produk dengan rasio 1:1 & cadangan ilustrasi jika belum ada foto */
export function ProductImage({ src, alt, icon, className }: { src: string | null; alt: string; icon?: string | null; className?: string }) {
  return (
    <div className={cx("relative aspect-square overflow-hidden bg-gradient-to-br from-brand-50 via-[#efedf9] to-brand-100", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" />
      ) : (
        <div className="grid size-full place-items-center text-5xl opacity-80" aria-label={alt}>
          {icon ?? "🛍️"}
        </div>
      )}
    </div>
  );
}
