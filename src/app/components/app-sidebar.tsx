import { ChevronLeft, X, ShieldCheck, type LucideIcon } from "lucide-react";
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
  mobileOpen: boolean;
  onSelect: (id: string) => void;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
};

export function AppSidebar({
  role,
  active,
  collapsed,
  mobileOpen,
  onSelect,
  onToggleCollapse,
  onCloseMobile,
}: AppSidebarProps) {
  const items = menuForRole(role);

  return (
    <>
      {/* Backdrop drawer (hanya mobile) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          // mobile: drawer geser; lg: kolom statis
          "fixed inset-y-0 left-0 z-50 flex h-full w-[248px] flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-in-out",
          "lg:static lg:z-auto lg:shrink-0 lg:translate-x-0 lg:transition-[width]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed && "lg:w-[72px]",
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            "pt-safe flex min-h-16 items-center gap-3 border-b border-sidebar-border px-4",
            collapsed && "lg:justify-center lg:px-0",
          )}
        >
          <BrandMark className="size-9 shrink-0" />
          <span className={cn("min-w-0", collapsed && "lg:hidden")}>
            <BrandLockup terang />
          </span>
          {/* Tutup drawer (mobile) */}
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Tutup menu"
            className="ml-auto flex size-9 items-center justify-center rounded-md text-sidebar-foreground hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Menu, dikelompokkan sesuai alur kerja */}
        <ScrollArea className="flex-1">
          <nav className="flex flex-col gap-1 p-3">
            {MENU_GROUPS.map((group) => {
              const anggota = items.filter((item) => item.group === group);
              if (anggota.length === 0) return null;
              return (
                <div key={group} className="mb-1">
                  <p
                    className={cn(
                      "px-3 pb-1 pt-2 text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/40",
                      collapsed && "lg:hidden",
                    )}
                  >
                    {group}
                  </p>
                  {collapsed && (
                    <div className="mx-3 my-2 hidden border-t border-sidebar-border lg:block" />
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
        <div className="pb-safe border-t border-sidebar-border p-3">
          <div
            className={cn(
              "mb-2 flex items-center gap-2 px-3 text-[11px] text-sidebar-foreground/50",
              collapsed && "lg:hidden",
            )}
          >
            <ShieldCheck className="size-3.5 shrink-0 text-success" />
            <span className="truncate">Data tersimpan di perangkat</span>
            <span className="ml-auto shrink-0 font-display">v1.0</span>
          </div>
          {/* Collapse rail hanya relevan di desktop */}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Perluas sidebar" : "Minimalkan sidebar"}
            className={cn(
              "hidden w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground transition-colors hover:bg-white/10 hover:text-white lg:flex",
              collapsed && "lg:justify-center lg:px-0",
            )}
          >
            <ChevronLeft
              className={cn(
                "size-5 shrink-0 transition-transform",
                collapsed && "rotate-180",
              )}
            />
            <span className={cn(collapsed && "lg:hidden")}>Minimalkan</span>
          </button>
        </div>
      </aside>
    </>
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
        collapsed && "lg:justify-center lg:px-0",
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-6 -translate-y-1/2 rounded-r-full bg-sidebar-primary"
          style={{ width: 3 }}
        />
      )}
      <Icon className={cn("size-[1.125rem] shrink-0", active && "text-sidebar-primary")} />
      <span className={cn("truncate", collapsed && "lg:hidden")}>{label}</span>
    </button>
  );

  if (!collapsed) return button;

  // Tooltip untuk rail terkolaps (desktop saja — di mobile label tetap tampil)
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" className="hidden lg:block">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
