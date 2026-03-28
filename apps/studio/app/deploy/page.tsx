"use client";

import { useEffect, useState } from "react";
import { DeployAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Rocket, Box, Activity, AlertCircle, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { PageSkeleton } from "@/components/page-skeleton";
import { cn } from "@/lib/utils";

const deployStatusStyles: Record<string, string> = {
    active:   "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    stopped:  "bg-muted/60 text-muted-foreground border-border/60",
    error:    "bg-red-400/10 text-red-400 border-red-400/20",
    pending:  "bg-amber-400/10 text-amber-400 border-amber-400/20",
};

export default function DeployPage() {
    const [deployments, setDeployments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        DeployAPI.listDeployments()
            .then((data) => { if (Array.isArray(data)) setDeployments(data); })
            .catch((err) => { console.error("[Deploy] Failed to load:", err); })
            .finally(() => setLoading(false));
    }, []);

    const activeCount = deployments.filter(d => d.status === "active").length;

    if (loading) return <PageSkeleton rows={4} />;

    return (
        <div className="p-6 md:p-8 space-y-6 animate-fade-in-up">
            <PageHeader
                title="Deployments"
                description="Manage real-time inference endpoints"
                action={
                    <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Rocket className="h-4 w-4" />
                        New Deployment
                    </Button>
                }
            />

            {/* Stats row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="glass-card border-border/50 bg-card/50">
                    <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Active Endpoints
                        </CardTitle>
                        <Box className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{activeCount}</div>
                    </CardContent>
                </Card>
                <Card className="glass-card border-border/50 bg-card/50">
                    <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Requests (24 h)
                        </CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">1.2M</div>
                        <p className="text-xs text-emerald-400 mt-1">+20.1% from yesterday</p>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card className="glass-card border-border/50 bg-card/50 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="border-border/50 hover:bg-transparent">
                            <TableHead className="text-xs text-muted-foreground font-medium">Name</TableHead>
                            <TableHead className="text-xs text-muted-foreground font-medium">Model / Adapter</TableHead>
                            <TableHead className="text-xs text-muted-foreground font-medium">Env</TableHead>
                            <TableHead className="text-xs text-muted-foreground font-medium">Status</TableHead>
                            <TableHead className="text-xs text-muted-foreground font-medium">Replicas</TableHead>
                            <TableHead className="text-xs text-muted-foreground font-medium text-right">Endpoint</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {deployments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="p-0">
                                    <EmptyState
                                        icon={AlertCircle}
                                        title="No deployments found"
                                        description="Deploy a trained adapter to create an inference endpoint."
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            deployments.map((d) => (
                                <TableRow key={d.id} className="border-border/40 hover:bg-white/[0.02]">
                                    <TableCell className="font-medium text-sm text-foreground">{d.name}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground font-mono">{d.model_id}</TableCell>
                                    <TableCell>
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground font-medium">
                                            {d.environment || "prod"}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn(
                                            "text-[10px] font-medium uppercase tracking-wide border",
                                            deployStatusStyles[d.status] ?? "text-muted-foreground"
                                        )}>
                                            {d.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{d.replicas || 1}</TableCell>
                                    <TableCell className="text-right">
                                        <a
                                            href={d.endpoint_url || "#"}
                                            className="inline-flex items-center gap-1 text-xs font-mono text-blue-400 hover:text-blue-300 transition-colors"
                                        >
                                            {(d.endpoint_url || "https://api.openlora.dev/v1/…").replace("https://", "")}
                                            <ExternalLink className="h-3 w-3 shrink-0" />
                                        </a>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
