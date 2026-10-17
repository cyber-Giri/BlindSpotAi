import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/bs/badges";
import { seo } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => seo("Settings", "Workspace preferences and demo controls."),
  component: Settings,
});

function Settings() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const reset = useStore((s) => s.resetDemo);
  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" demo={false} />
      <div className="surface divide-y">
        <label className="flex items-center justify-between p-4 text-sm">Dark mode<Switch checked={theme === "dark"} onCheckedChange={(c) => setTheme(c ? "dark" : "light")} /></label>
        <div className="flex items-center justify-between p-4 text-sm">
          <div><div>AI backend</div><div className="text-xs text-muted-foreground">Not connected — all analysis uses demo data.</div></div>
        </div>
        <div className="flex items-center justify-between p-4 text-sm">
          <div><div>Reset demo</div><div className="text-xs text-muted-foreground">Restore all sample findings, assumptions and activity.</div></div>
          <Button variant="outline" size="sm" onClick={() => { reset(); toast.success("Demo reset"); }}>Reset Demo</Button>
        </div>
      </div>
    </div>
  );
}
