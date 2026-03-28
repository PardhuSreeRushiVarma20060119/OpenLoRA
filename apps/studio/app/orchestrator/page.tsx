"use client";

import { useEffect, useState } from "react";
import { OrchestratorAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Server, Activity, Cpu, MemoryStick } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { PageSkeleton } from "@/components/page-skeleton";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
    running:   "bg-blue-400/10 text-blue-400 border-blue-400/20",
    completed: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    failed:    "bg-red-400/10 text-red-400 border-red-400/20",
    pending:   "bg-amber-400/10 text-amber-400 border-amber-400/20",
};

export default function OrchestratorPage() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [nodes, setNodes] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [jobsData, nodesData] = await Promise.all([
                    OrchestratorAPI.getJobs().catch(() => []),
                    OrchestratorAPI.getNodes().catch(() => null)
                ]);
                if (Array.isArray(jobsData)) setJobs(jobsData);
                setNodes(nodesData);
            } catch {
                // fail silently — empty state handles it
                console.error("[Orchestrator] Failed to fetch data");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <PageSkeleton rows={4} />;

    return (
        <div className="p-6 md:p-8 space-y-8 animate-fade-in-up">
            <PageHeader
                title="Orchestrator"
                description="Cluster node status and job queue"
            />

            {/* ── Compute Nodes ── */}
            <section>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                    <Server className="h-4 w-4" /> Compute Nodes
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Live cluster card */}
                    <Card className="glass-card border-border/50 bg-card/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Cluster Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1">
                            <div className="text-xl font-bold text-foreground">
                                {nodes?.status || "Unknown"}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Active Nodes: <span className="text-foreground font-medium">{nodes?.active_nodes ?? 0}</span>
                            </p>
                        </CardContent>
                    </Card>

                    {/* Simulated node cards */}
                    {[
                        { name: "node-01", gpu: "A100 80GB", status: "online" },
                        { name: "node-02", gpu: "H100 SXM",  status: "online" },
                    ].map((node) => (
                        <Card key={node.name} className="glass-card border-border/50 bg-card/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    {node.name}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                    <span className={cn(
                                        "w-2 h-2 rounded-full",
                                        node.status === "online" ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"
                                    )} />
                                    {node.status === "online" ? "Online" : "Offline"}
                                </div>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Cpu className="h-3 w-3" /> {node.gpu}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* ── Job Queue ── */}
            <section>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4" /> Job Queue
                </h2>
                <Card className="glass-card border-border/50 bg-card/50 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-border/50 hover:bg-transparent">
                                <TableHead className="text-xs text-muted-foreground font-medium">Job ID</TableHead>
                                <TableHead className="text-xs text-muted-foreground font-medium">Name</TableHead>
                                <TableHead className="text-xs text-muted-foreground font-medium">Status</TableHead>
                                <TableHead className="text-xs text-muted-foreground font-medium">Progress</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {jobs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="p-0">
                                        <EmptyState
                                            icon={Activity}
                                            title="No jobs in queue"
                                            description="Start a training run to see it here."
                                        />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                jobs.map((job) => (
                                    <TableRow key={job.id} className="border-border/40 hover:bg-white/[0.02]">
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {job.id?.substring(0, 8)}…
                                        </TableCell>
                                        <TableCell className="font-medium text-sm">
                                            {job.name || "Untitled Job"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={cn("text-[10px] font-medium uppercase tracking-wide border",
                                                    statusStyles[job.status] ?? "text-muted-foreground"
                                                )}
                                            >
                                                {job.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 bg-secondary h-1.5 rounded-full overflow-hidden">
                                                    <div
                                                        className="bg-blue-400 h-full rounded-full transition-all duration-700"
                                                        style={{ width: `${job.progress || 0}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-muted-foreground w-8 text-right">
                                                    {job.progress || 0}%
                                                </span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </section>
        </div>
    );
}
