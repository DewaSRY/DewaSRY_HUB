import { Cloud, Code2, Database, LayoutTemplate, Server, ShieldCheck, type LucideIcon } from "lucide-react";

export interface SkillItem {
  title: string;
  description: string;
}

const ICONS: LucideIcon[] = [LayoutTemplate, Server, Database, Cloud, ShieldCheck, Code2];

/** Grid of capability cards (home and about). */
export function SkillsGrid({ items }: { items: SkillItem[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => {
        const Icon = ICONS[index % ICONS.length];
        return (
          <li key={item.title} className="rounded-2xl border bg-card p-6 shadow-xs transition-shadow hover:shadow-md">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-5" aria-hidden />
            </span>
            <h3 className="mt-4 font-semibold">{item.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
          </li>
        );
      })}
    </ul>
  );
}
