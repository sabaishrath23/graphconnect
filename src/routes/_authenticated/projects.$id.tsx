import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import cytoscape from "cytoscape";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { analyze, type Analytics, type Edge } from "@/lib/graph-analytics";
import { ArrowLeft, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/projects/$id")({
  component: ProjectPage,
});

function ProjectPage() {
  const { id } = Route.useParams();
  const [title, setTitle] = useState<string>("");
  const [nodes, setNodes] = useState<string[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: proj }, { data: nRows, error: nErr }, { data: eRows, error: eErr }] =
        await Promise.all([
          supabase.from("projects").select("title").eq("id", id).single(),
          supabase.from("nodes").select("node_name").eq("project_id", id).limit(10000),
          supabase.from("edges").select("source_node, target_node, weight").eq("project_id", id).limit(20000),
        ]);
      if (nErr || eErr) toast.error((nErr ?? eErr)!.message);
      setTitle(proj?.title ?? "Project");
      setNodes((nRows ?? []).map((r) => r.node_name));
      setEdges((eRows ?? []).map((r) => ({ source: r.source_node, target: r.target_node, weight: Number(r.weight) || 1 })));
      setLoading(false);
    })();
  }, [id]);

  const analytics: Analytics | null = useMemo(() => {
    if (loading || (nodes.length === 0 && edges.length === 0)) return null;
    return analyze(nodes, edges);
  }, [nodes, edges, loading]);

  // Render cytoscape
  useEffect(() => {
    if (!containerRef.current || loading || !analytics) return;
    const maxDeg = Math.max(1, ...Object.values(analytics.degree));
    const cy = cytoscape({
      container: containerRef.current,
      elements: [
        ...Object.keys(analytics.degree).map((n) => ({
          data: { id: n, label: n, deg: analytics.degree[n] },
        })),
        ...edges.map((e, i) => ({
          data: { id: `e${i}`, source: e.source, target: e.target },
        })),
      ],
      style: [
        {
          selector: "node",
          style: {
            "background-color": "#2563EB",
            label: "data(label)",
            "font-size": 10,
            color: "#1E293B",
            "text-margin-y": -4,
            width: (n: cytoscape.NodeSingular) => 12 + (n.data("deg") / maxDeg) * 28,
            height: (n: cytoscape.NodeSingular) => 12 + (n.data("deg") / maxDeg) * 28,
            "border-width": 1,
            "border-color": "#1E40AF",
          },
        },
        {
          selector: "edge",
          style: {
            width: 1,
            "line-color": "#CBD5E1",
            "curve-style": "haystack",
          },
        },
        {
          selector: ".highlight",
          style: { "background-color": "#F59E0B", "border-color": "#B45309", "z-index": 99 },
        },
      ],
      layout: { name: "cose", animate: false, nodeRepulsion: 8000, idealEdgeLength: 60 } as cytoscape.LayoutOptions,
      wheelSensitivity: 0.2,
    });
    cyRef.current = cy;
    return () => { cy.destroy(); cyRef.current = null; };
  }, [analytics, edges, loading]);

  function doSearch() {
    if (!cyRef.current) return;
    cyRef.current.nodes().removeClass("highlight");
    if (!search.trim()) return;
    const match = cyRef.current.nodes().filter((n) => n.data("label").toLowerCase().includes(search.toLowerCase()));
    match.addClass("highlight");
    if (match.length) cyRef.current.animate({ center: { eles: match }, zoom: 1.5 }, { duration: 400 });
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
          </Link>
          <h1 className="text-xl font-semibold">{title}</h1>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading network...</p>
      ) : !analytics ? (
        <Card className="p-12 text-center">
          <h2 className="font-semibold">No data in this project</h2>
          <p className="mt-1 text-sm text-muted-foreground">Upload a CSV from the dashboard when creating the project.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Nodes" value={analytics.nodeCount} />
            <Stat label="Edges" value={analytics.edgeCount} />
            <Stat label="Density" value={analytics.density.toFixed(4)} />
            <Stat label="Avg degree" value={(analytics.edgeCount * 2 / Math.max(1, analytics.nodeCount)).toFixed(2)} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="p-4 lg:col-span-2">
              <div className="mb-3 flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search user..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doSearch()}
                />
                <Button size="sm" onClick={doSearch}>Find</Button>
              </div>
              <div ref={containerRef} className="h-[600px] w-full rounded-md border border-border bg-secondary/30" />
            </Card>

            <div className="space-y-4">
              <RankCard title="Top influencers (degree)" rows={analytics.topDegree} fmt={(v) => v.toString()} />
              <RankCard title="Bridge nodes (betweenness)" rows={analytics.topBetweenness} fmt={(v) => v.toFixed(2)} />
              <RankCard title="Fastest reach (closeness)" rows={analytics.topCloseness} fmt={(v) => v.toFixed(4)} />
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </Card>
  );
}

function RankCard({ title, rows, fmt }: { title: string; rows: Array<[string, number]>; fmt: (v: number) => string }) {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ol className="mt-2 space-y-1 text-sm">
        {rows.length === 0 && <li className="text-muted-foreground">—</li>}
        {rows.map(([name, v], i) => (
          <li key={name} className="flex items-center justify-between">
            <span className="truncate"><span className="text-muted-foreground">{i + 1}.</span> {name}</span>
            <span className="tabular-nums text-muted-foreground">{fmt(v)}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
