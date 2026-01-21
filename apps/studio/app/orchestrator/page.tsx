"use client";

import { useEffect, useState } from "react";
import { OrchestratorAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Server, Activity, Clock } from "lucide-react";

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

                if (Array.isArray(jobsData)) {
                    setJobs(jobsData);
                }
                setNodes(nodesData);
                setLoading(false);
            } catch (error) {
                console.error("Orchestrator load failed", error);
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="p-8 animate-pulse text-muted-foreground">Loading orchestrator state...</div>;

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Orchestrator</h1>
                <p className="text-muted-foreground">Cluster Node Status & Job Queue</p>
            </div>

            {/* Nodes Section */}
            <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Server className="h-5 w-5 text-primary" />
                    Compute Nodes
                </h2>
                <div className="grid gap-4 md:grid-cols-3">
                    {/* Placeholder for now as nodes endpoint structure is generic map */}
                    <Card className="glass-card border-border/50 bg-card/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Cluster Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{nodes?.status || "Unknown"}</div>
                            <p className="text-xs text-muted-foreground">
                                Active Nodes: {nodes?.active_nodes || 0}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Fake node cards until endpoint returns list */}
                    {[1, 2].map((i) => (
                        <Card key={i} className="glass-card border-border/50 bg-card/50 opacity-50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Node-{i} (Simulated)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-lg font-semibold flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    Online
                                </div>
                                <p className="text-xs text-muted-foreground">RTX 4090 • 24GB VRAM</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Jobs Section */}
            <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Job Queue
                </h2>
                <Card className="glass-card border-border/50 bg-card/50">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Job ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Progress</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {jobs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                        No active jobs in queue.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                jobs.map((job) => (
                                    <TableRow key={job.id}>
                                        <TableCell className="font-mono text-xs">{job.id.substring(0, 8)}...</TableCell>
                                        <TableCell>{job.name || "Untitled Job"}</TableCell>
                                        <TableCell>
                                            <Badge variant={job.status === "running" ? "default" : "secondary"}>
                                                {job.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="w-[60%] bg-secondary h-2 rounded-full overflow-hidden">
                                                <div
                                                    className="bg-primary h-full transition-all"
                                                    style={{ width: `${job.progress || 0}%` }}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </div>
    );
}
