import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, Plus, Network, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type Project = { id: string; title: string; description: string | null; created_at: string };

function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("projects")
      .select("id, title, description, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setProjects(data ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("projects")
      .insert({ title: title.trim(), description: description.trim() || null, user_id: userData.user!.id })
      .select("id")
      .single();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Project created");
    setOpen(false);
    setTitle(""); setDescription("");
    if (fileRef.current?.files?.[0]) {
      await handleCsv(fileRef.current.files[0], data!.id);
    }
    navigate({ to: "/projects/$id", params: { id: data!.id } });
  }

  async function handleCsv(file: File, projectId: string) {
    toast.info("Parsing CSV...");
    return new Promise<void>((resolve) => {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (res) => {
          const rows = res.data;
          if (!rows.length) { toast.error("Empty CSV"); resolve(); return; }
          const cols = Object.keys(rows[0]).map((c) => c.toLowerCase());
          const srcKey = Object.keys(rows[0]).find((k) => ["source", "from", "user", "user1", "a"].includes(k.toLowerCase()));
          const tgtKey = Object.keys(rows[0]).find((k) => ["target", "to", "friend", "user2", "b"].includes(k.toLowerCase()));
          if (!srcKey || !tgtKey) {
            toast.error(`CSV needs columns like source,target. Found: ${cols.join(", ")}`);
            resolve(); return;
          }
          const edgeRows = rows
            .map((r) => ({ source: (r[srcKey] ?? "").trim(), target: (r[tgtKey] ?? "").trim() }))
            .filter((r) => r.source && r.target);
          const nodesSet = new Set<string>();
          edgeRows.forEach((r) => { nodesSet.add(r.source); nodesSet.add(r.target); });
          const nodeRows = Array.from(nodesSet).map((n) => ({ project_id: projectId, node_name: n }));

          // Chunked inserts
          for (let i = 0; i < nodeRows.length; i += 500) {
            const chunk = nodeRows.slice(i, i + 500);
            const { error } = await supabase.from("nodes").insert(chunk);
            if (error) { toast.error(error.message); resolve(); return; }
          }
          const edgeInserts = edgeRows.map((r) => ({ project_id: projectId, source_node: r.source, target_node: r.target }));
          for (let i = 0; i < edgeInserts.length; i += 500) {
            const chunk = edgeInserts.slice(i, i + 500);
            const { error } = await supabase.from("edges").insert(chunk);
            if (error) { toast.error(error.message); resolve(); return; }
          }
          toast.success(`Loaded ${nodeRows.length} nodes, ${edgeInserts.length} edges`);
          resolve();
        },
        error: () => { toast.error("CSV parse failed"); resolve(); },
      });
    });
  }

  async function del(id: string) {
    if (!confirm("Delete this project?")) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setProjects((p) => p.filter((x) => x.id !== id));
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your projects</h1>
          <p className="text-sm text-muted-foreground">Upload a CSV of edges and explore the network.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />New project</Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={createProject}>
              <DialogHeader><DialogTitle>New network project</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="t">Title</Label>
                  <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="d">Description</Label>
                  <Input id="d" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="f">Edges CSV (columns: source,target)</Label>
                  <Input id="f" type="file" ref={fileRef} accept=".csv,text/csv" />
                  <p className="mt-1 text-xs text-muted-foreground">Optional — you can add data later.</p>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={busy}>
                  <Upload className="mr-2 h-4 w-4" />Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : projects.length === 0 ? (
        <Card className="p-12 text-center">
          <Network className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 font-semibold">No projects yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Create your first network to get started.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.id} className="group p-5 transition hover:border-primary/50">
              <div className="flex items-start justify-between">
                <Link to="/projects/$id" params={{ id: p.id }} className="flex-1">
                  <h3 className="font-semibold text-foreground">{p.title}</h3>
                  {p.description && <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>}
                  <p className="mt-3 text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => del(p.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
