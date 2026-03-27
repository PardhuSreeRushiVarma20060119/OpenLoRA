"use client";

import { useEffect, useState } from "react";
import { DatasetsAPI } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, Upload, FileText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { PageSkeleton } from "@/components/page-skeleton";

const formatColors: Record<string, string> = {
    jsonl:  "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    csv:    "bg-blue-400/10 text-blue-400 border-blue-400/20",
    parquet:"bg-violet-400/10 text-violet-400 border-violet-400/20",
    json:   "bg-amber-400/10 text-amber-400 border-amber-400/20",
};

export default function DatasetsPage() {
    const [datasets, setDatasets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        DatasetsAPI.list()
            .then((data) => { if (Array.isArray(data)) setDatasets(data); })
            .catch((err) => { console.error("[Datasets] Failed to load:", err); })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <PageSkeleton />;

    return (
        <div className="p-6 md:p-8 space-y-6 animate-fade-in-up">
            <PageHeader
                title="Datasets"
                description="Manage and version-control your training data"
                action={
                    <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Upload className="h-4 w-4" />
                        Upload Dataset
                    </Button>
                }
            />

            <Card className="glass-card border-border/50 bg-card/50 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="border-border/50 hover:bg-transparent">
                            <TableHead className="text-xs text-muted-foreground font-medium">Name</TableHead>
                            <TableHead className="text-xs text-muted-foreground font-medium">Format</TableHead>
                            <TableHead className="text-xs text-muted-foreground font-medium">Size</TableHead>
                            <TableHead className="text-xs text-muted-foreground font-medium">Rows</TableHead>
                            <TableHead className="text-xs text-muted-foreground font-medium text-right">Updated</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {datasets.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="p-0">
                                    <EmptyState
                                        icon={Database}
                                        title="No datasets uploaded"
                                        description="Upload your first dataset to start fine-tuning."
                                        action={
                                            <Button size="sm" variant="outline" className="gap-2">
                                                <Upload className="h-3 w-3" />
                                                Upload Dataset
                                            </Button>
                                        }
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            datasets.map((ds) => {
                                const fmt = (ds.format || "jsonl").toLowerCase();
                                return (
                                    <TableRow key={ds.id} className="border-border/40 hover:bg-white/[0.02]">
                                        <TableCell className="font-medium text-sm text-foreground flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                            {ds.name}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`text-[10px] font-medium uppercase tracking-wide border ${formatColors[fmt] ?? "text-muted-foreground"}`}>
                                                {fmt}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {ds.size_bytes ? `${(ds.size_bytes / 1024 / 1024).toFixed(1)} MB` : "—"}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {ds.num_rows?.toLocaleString() ?? "—"}
                                        </TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground">
                                            {ds.updated_at ? new Date(ds.updated_at).toLocaleDateString() : "—"}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
