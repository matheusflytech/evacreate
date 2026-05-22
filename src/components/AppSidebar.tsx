import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, FolderKanban, Upload, Download, ChevronLeft } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/eva-logo.jpeg";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projetos", label: "Projetos", icon: FolderKanban },
  { to: "/uploads", label: "Uploads", icon: Upload },
  { to: "/exportacoes", label: "Exportações", icon: Download },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside
      className={cn(
        "shrink-0 h-screen sticky top-0 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-[240px]",
      )}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 ring-1 ring-white/10 bg-[#0a1428]">
          <img src={logo} alt="Eva Create" className="w-full h-full object-cover" />
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <div className="font-display text-[15px] font-semibold tracking-tight">Eva Create</div>
          </div>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {nav.map((item) => {
          const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 h-10 rounded-md text-sm transition-colors group relative",
                active
                  ? "bg-primary/15 text-white"
                  : "text-muted-foreground hover:text-white hover:bg-sidebar-accent",
              )}
            >
              {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-primary" />}
              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-full flex items-center gap-3 px-3 h-9 rounded-md text-xs text-muted-foreground hover:text-white hover:bg-sidebar-accent transition-colors"
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && <span>Recolher</span>}
        </button>
      </div>
    </aside>
  );
}
