import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-6 mb-8">
      <div>
        <h1 className="text-[28px] font-display font-semibold text-gradient-blue leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
