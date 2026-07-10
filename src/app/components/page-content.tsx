import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { NAV_ITEMS, ROLE_LABEL, type Role } from "../navigation";

type PageContentProps = {
  active: string;
  role: Role;
};

export function PageContent({ active, role }: PageContentProps) {
  const item = NAV_ITEMS.find((i) => i.id === active) ?? NAV_ITEMS[0];
  const Icon = item.icon;

  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      {/* Page heading */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-6" />
          </div>
          <div className="leading-tight">
            <h1>{item.label}</h1>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
        </div>
        <Badge variant="secondary">Role: {ROLE_LABEL[role]}</Badge>
      </div>

      {/* Sample card layout to demonstrate the design system */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <Card key={n} className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">
                {item.label} — Panel {n}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Konten untuk halaman <span className="text-foreground">{item.label}</span>{" "}
                akan ditampilkan di sini. Gunakan struktur card-based ini sebagai
                fondasi layout.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
