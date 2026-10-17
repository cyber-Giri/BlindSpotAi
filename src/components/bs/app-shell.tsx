import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell, ChevronsUpDown, FileBarChart, FlaskConical, Gauge, Lightbulb, ListChecks, Menu, Moon, Network,
  ScanSearch, Search, Settings, ShieldQuestion, SlidersHorizontal, Sun, Swords, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useStore } from "@/lib/store";
import { DEMO_PROJECT } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FindingDrawer } from "./finding-drawer";
import { SeverityBadge } from "./badges";

export const NAV = [
  { to: "/", label: "Overview", icon: Gauge },
  { to: "/analyze", label: "Analyze Project", icon: ScanSearch },
  { to: "/findings", label: "Findings", icon: ShieldQuestion },
  { to: "/ripple", label: "Ripple Effect", icon: Network },
  { to: "/devils-advocate", label: "Devil's Advocate", icon: Swords },
  { to: "/what-if", label: "What-If Simulator", icon: SlidersHorizontal },
  { to: "/ledger", label: "Assumption Ledger", icon: ListChecks },
  { to: "/recommendations", label: "Recommendations", icon: Lightbulb },
  { to: "/reports", label: "Reports", icon: FileBarChart },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function SidebarBody({ onNav }: { onNav?: () => void }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const reset = useStore((s) => s.resetDemo);
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
          <ScanSearch className="size-4" />
        </div>
        <span className="font-semibold tracking-tight">BlindSpot AI</span>
      </div>
      <nav className="flex-1 space-y-0.5 px-2 py-2">
        {NAV.map((n) => {
          const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
          return (
            <Link key={n.to} to={n.to} onClick={onNav}
              className={cn("flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/60")}>
              <n.icon className="size-4" />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-2 border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center justify-between rounded-md border border-sidebar-border px-2.5 py-1.5 text-left text-xs">
              <span className="flex items-center gap-1.5"><FlaskConical className="size-3.5 text-primary" />{DEMO_PROJECT.workspace}</span>
              <ChevronsUpDown className="size-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            <DropdownMenuItem>Demo Workspace ✓</DropdownMenuItem>
            <DropdownMenuItem disabled>Real workspaces require a backend</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { reset(); toast.success("Demo reset to original data"); }}>Reset Demo</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex items-center gap-2 px-1">
          <div className="grid size-7 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">OB</div>
          <div className="text-xs leading-tight"><div className="font-medium">Omi Bhawsar</div><div className="text-muted-foreground">Project lead</div></div>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawer, setDrawer] = useState<string | null>(null);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const findings = useStore((s) => s.findings);
  const activity = useStore((s) => s.activity);
  const reset = useStore((s) => s.resetDemo);
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const current = NAV.find((n) => (n.to === "/" ? path === "/" : path.startsWith(n.to)));

  useEffect(() => {
    useStore.persist.rehydrate();
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen((o) => !o); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  return (
    <div className="flex min-h-screen w-full">
      <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarBody />
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/30" onClick={() => setMobileOpen(false)} />
          <aside className="relative h-full w-64 bg-sidebar shadow-xl">
            <button className="absolute right-3 top-4" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X className="size-4" /></button>
            <SidebarBody onNav={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu className="size-4" /></Button>
          <div className="flex min-w-0 items-center gap-1.5 text-sm">
            <span className="hidden text-muted-foreground sm:inline">{DEMO_PROJECT.workspace}</span>
            <span className="hidden text-muted-foreground sm:inline">/</span>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 truncate font-medium">
                {DEMO_PROJECT.name}<ChevronsUpDown className="size-3.5 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Projects</DropdownMenuLabel>
                <DropdownMenuItem>{DEMO_PROJECT.name} (demo) ✓</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/analyze" })}>+ Analyze a new project</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {current && current.to !== "/" && (<><span className="text-muted-foreground">/</span><span className="truncate text-muted-foreground">{current.label}</span></>)}
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="outline" size="sm" className="hidden gap-2 text-muted-foreground md:flex" onClick={() => setSearchOpen(true)}>
              <Search className="size-3.5" /> Search findings <kbd className="rounded bg-muted px-1 text-[10px]">⌘K</kbd>
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSearchOpen(true)} aria-label="Search"><Search className="size-4" /></Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                  <Bell className="size-4" /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-critical" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                {activity.slice(0, 5).map((a) => (
                  <DropdownMenuItem key={a.id} className="flex-col items-start gap-0.5" onClick={() => navigate({ to: "/" })}>
                    <span className="text-sm">{a.text}</span>
                    <span className="text-xs text-muted-foreground">{new Date(a.at).toLocaleString()}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger className="ml-1 grid size-8 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">OB</DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Omi Bhawsar</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { reset(); toast.success("Demo reset"); }}>Reset Demo</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search findings…" />
        <CommandList>
          <CommandEmpty>No findings match.</CommandEmpty>
          <CommandGroup heading="Findings (demo)">
            {findings.map((f) => (
              <CommandItem key={f.id} value={`${f.id} ${f.title} ${f.category}`} onSelect={() => { setSearchOpen(false); setDrawer(f.id); }}>
                <span className="mr-2 font-mono text-xs text-muted-foreground">{f.id}</span>
                <span className="flex-1 truncate">{f.title}</span>
                <SeverityBadge s={f.severity} />
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
      <FindingDrawer id={drawer} onClose={() => setDrawer(null)} />
    </div>
  );
}
