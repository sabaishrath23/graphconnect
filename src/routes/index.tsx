import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Network, Users, GitBranch, TrendingUp, Zap, Share2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

const features = [
  { icon: Network, title: "Interactive Visualization", desc: "Explore networks with pan, zoom, and search." },
  { icon: Users, title: "Community Detection", desc: "Surface tightly connected clusters automatically." },
  { icon: TrendingUp, title: "Centrality Analysis", desc: "Identify influencers using degree, betweenness, closeness." },
  { icon: GitBranch, title: "Graph Theory", desc: "Density, shortest paths, bridge nodes at a glance." },
  { icon: Zap, title: "Fast Uploads", desc: "Drop a CSV of edges — analysis in seconds." },
  { icon: Share2, title: "Own Your Data", desc: "Every project scoped to your account." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Network className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight">GraphConnect</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Powered by Graph Theory
        </div>
        <h1 className="mt-6 text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
          Analyze Social Networks
          <br />
          <span className="text-primary">Through Graph Theory</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Upload your network data, visualize relationships, detect communities, and identify
          the most influential users — all in your browser.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/auth">
            <Button size="lg">Start analyzing</Button>
          </Link>
          <a href="#features">
            <Button size="lg" variant="outline">See features</Button>
          </a>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="p-6">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} GraphConnect Analytics
        </div>
      </footer>
    </div>
  );
}
