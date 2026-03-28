"use client";

import { useEffect, useState } from "react";
import { ExperimentsAPI } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Beaker } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { PageSkeleton } from "@/components/page-skeleton";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
    active:    "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    completed: "bg-blue-400/10 text-blue-400 border-blue-400/20",
    failed:    "bg-red-400/10 text-red-400 border-red-400/20",
    paused:    "bg-amber-400/10 text-amber-400 border-amber-400/20",
};

export default function ExperimentsPage() {
    const [experiments, setExperiments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        ExperimentsAPI.list()
            .then((data) => { if (Array.isArray(data)) setExperiments(data); })
            .catch((err) => { console.error("[Experiments] Failed to load:", err); })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <PageSkeleton />;

    return (
        <div className="p-6 md:p-8 space-y-6 animate-fade-in-up">
            <PageHeader
                title="Experiments"
                description="Track training runs and evaluation metrics"
                action={
                    <Button size="sm" className="gap-2 bg-violet-600 hover:bg-violet-700 text-white shadow-glow-violet">
                        <Plus className="h-4 w-4" />
                        New Experiment
                    </Button>
                }
            />

            <Card className="glass-card border-border/50 bg-card/50 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="border-border/50 hover:bg-transparent">
                            <TableHead className="text-xs text-muted-foreground font-medium">ID</TableHead>
                            <TableHead className="text-xs text-muted-foreground font-medium">Name</TableHead>
                            <TableHead className="text-xs text-muted-foreground font-medium">Runs</TableHead>
                            <TableHead className="text-xs text-muted-foreground font-medium">Status</TableHead>
                            <TableHead className="text-xs text-muted-foreground font-medium text-right">Created</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {experiments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="p-0">
                                    <EmptyState
                                        icon={Beaker}
                                        title="No experiments yet"
                                        description="Create your first experiment to start tracking model performance."
                                        action={
                                            <Button size="sm" variant="outline" className="gap-2">
                                                <Plus className="h-3 w-3" />
                                                New Experiment
                                            </Button>
                                        }
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            experiments.map((exp) => (
                                <TableRow key={exp.id} className="border-border/40 hover:bg-white/[0.02] cursor-pointer">
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        {exp.id?.substring(0, 8)}…
                                    </TableCell>
                                    <TableCell className="font-medium text-sm text-foreground">
                                        {exp.name || "Untitled Experiment"}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {exp.run_count || 0}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn(
                                            "text-[10px] font-medium uppercase tracking-wide border",
                                            statusColors[(exp.status || "active").toLowerCase()] ?? "text-muted-foreground"
                                        )}>
                                            {exp.status || "Active"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right text-xs text-muted-foreground">
                                        {exp.created_at ? new Date(exp.created_at).toLocaleDateString() : "—"}
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
