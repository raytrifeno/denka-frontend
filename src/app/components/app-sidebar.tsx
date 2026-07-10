import { ChevronLeft, ShieldCheck, type LucideIcon } from "lucide-react";
import { cn } from "./ui/utils";
import { ScrollArea } from "./ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { menuForRole, MENU_GROUPS, type Role } from "../navigation";
import { BrandMark, BrandLockup } from "./brand-mark";

type AppSidebarProps = {
  role: Role;
  active: string;
  collapsed: boolean;
  onSelect: (id: string) => void;
  onToggleCollapse: () => void;
};

export function AppSidebar({
  role,
  active,
  collapsed,
  onSelect,
  onToggleCollapse,
}: AppSidebarProps) {
  const items = menuForRole(role);

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-[248px]",
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex h-16 items-center gap-3 border-b border-sidebar-border px-4",
          collapsed && "justify-center px-0",
        )}
      >
        <BrandMark className="size-9 shrink-0" />
        {!collapsed && <BrandLockup terang />}
      </div>

      {/* Menu, dikelompokkan sesuai alur kerja */}
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-1 p-3">
          {MENU_GROUPS.map((group) => {
            const anggota = items.filter((item) => item.group === group);
            if (anggota.length === 0) return null;
            return (
              <div key={group} className="mb-1">
                {collapsed ? (
                  <div className="mx-3 my-2 border-t border-sidebar-border" />
                ) : (
                  <p className="px-3 pb-1 pt-2 text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/40">
                    {group}
                  </p>
                )}
                <div className="flex flex-col gap-1">
                  {anggota.map((item) => (
                    <NavButton
                      key={item.id}
                      icon={item.icon}
                      label={item.label}
                      active={active === item.id}
                      collapsed={collapsed}
                      onClick={() => onSelect(item.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Status + collapse */}
      <div className="border-t border-sidebar-border p-3">
        {!collapsed && (
          <div className="mb-2 flex items-center gap-2 px-3 text-[11px] text-sidebar-foreground/50">
            <ShieldCheck className="size-3.5 shrink-0 text-success" />
            <span className="truncate">Data tersimpan di perangkat</span>
            <span className="ml-auto shrink-0 font-display">v1.0</span>
          </div>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Perluas sidebar" : "Minimalkan sidebar"}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground transition-colors hover:bg-white/10 hover:text-white",
            collapsed && "justify-center px-0",
          )}
        >
          <ChevronLeft
            className={cn(
              "size-5 shrink-0 transition-transform",
              collapsed && "rotate-180",
            )}
          />
          {!collapsed && <span>Minimalkan</span>}
        </button>
      </div>
    </aside>
  );
}

type NavButtonProps = {
  icon: LucideIcon;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
};

function NavButton({
  icon: Icon,
  label,
  active,
  collapsed,
  onClick,
}: NavButtonProps) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
        active
          ? "bg-white/10 font-medium text-white"
          : "text-sidebar-foreground hover:bg-white/10 hover:text-white",
        collapsed && "justify-center px-0",
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-6 -translate-y-1/2 rounded-r-full bg-sidebar-primary"
          style={{ width: 3 }}
        />
      )}
      <Icon className={cn("size-[1.125rem] shrink-0", active && "text-sidebar-primary")} />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );

  if (!collapsed) return button;

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
