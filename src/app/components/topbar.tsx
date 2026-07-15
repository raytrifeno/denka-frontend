import {
  Search,
  Bell,
  PanelLeft,
  ChevronDown,
  LogOut,
  Package2,
  Wrench,
} from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Separator } from "./ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { ROLE_LABEL, type Role } from "../navigation";
import { AuthController } from "../../domain/controllers/AuthController";
import { ReportController } from "../../domain/controllers/ReportController";
import { useController } from "../hooks/use-controller";
import { SyncIndicator } from "./sync-indicator";

type TopbarProps = {
  role: Role;
  onToggleCollapse: () => void;
  onOpenMobile: () => void;
  onLogout: () => void;
};

/**
 * Topbar — boundary class. Identitas pengguna dari AuthController,
 * notifications (stok menipis & service) dari ReportController.
 */
export function Topbar({ role, onToggleCollapse, onOpenMobile, onLogout }: TopbarProps) {
  const auth = AuthController.getInstance();
  const report = ReportController.getInstance();
  useController(auth);
  useController(report);

  const user = auth.currentUser;
  const notifications = report.notifications();

  return (
    <header className="pt-safe flex min-h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
      {/* Mobile: buka drawer menu */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenMobile}
        aria-label="Buka menu"
        className="shrink-0 lg:hidden"
      >
        <PanelLeft className="size-5" />
      </Button>
      {/* Desktop: minimalkan/perluas sidebar */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleCollapse}
        aria-label="Toggle sidebar"
        className="hidden shrink-0 lg:inline-flex"
      >
        <PanelLeft className="size-5" />
      </Button>

      {/* Global search */}
      <div className="relative hidden w-full max-w-md sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Cari barang, transaksi, atau tiket service..."
          className="bg-input-background pl-9"
        />
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <SyncIndicator />

        <Separator orientation="vertical" className="mx-1 hidden h-8 sm:block" />

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label="Notifikasi"
            >
              <Bell className="size-5" />
              {notifications.length > 0 && (
                <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                  {notifications.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between px-4 py-3">
              <p>Notifikasi</p>
              <Badge variant="secondary">{notifications.length} baru</Badge>
            </div>
            <Separator />
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Tidak ada notifications.
                </p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
                  >
                    <span
                      className={
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg " +
                        (n.type === "stok"
                          ? "bg-warning/15 text-warning"
                          : "bg-info/15 text-info")
                      }
                    >
                      {n.type === "stok" ? (
                        <Package2 className="size-4" />
                      ) : (
                        <Wrench className="size-4" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm">
                        {n.type === "stok" ? "Stok menipis: " + n.title : n.title}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {n.detail}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
            <Separator />
            <button
              type="button"
              className="w-full px-4 py-2.5 text-center text-sm text-primary transition-colors hover:bg-accent"
            >
              Lihat semua notifications
            </button>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="mx-1 hidden h-8 sm:block" />

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-accent"
            >
              <Avatar className="size-9">
                {user?.avatar && <AvatarImage src={user.avatar} alt="" />}
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user?.initials() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-left leading-tight md:block">
                <span className="block text-sm">{user?.name ?? "-"}</span>
                <span className="block text-xs text-muted-foreground">
                  {ROLE_LABEL[role]}
                </span>
              </span>
              <ChevronDown className="hidden size-4 text-muted-foreground md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <div className="leading-tight">
                <p className="text-sm">{user?.name ?? "-"}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.email ?? "-"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onLogout}>
              <LogOut className="mr-2 size-4" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
