"use client";

import { useEffect, useState } from "react";
import { DatasetsAPI } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, Upload, FileText } from "lucide-react";

export default function DatasetsPage() {
    const [datasets, setDatasets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDatasets = async () => {
            try {
                const data = await DatasetsAPI.list();
                if (Array.isArray(data)) {
                    setDatasets(data);
                }
                setLoading(false);
            } catch (error) {
                console.error("Failed to load datasets", error);
                setLoading(false);
            }
        };

        fetchDatasets();
    }, []);

    if (loading) return <div className="p-8 animate-pulse text-muted-foreground">Loading datasets...</div>;

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Datasets</h1>
                    <p className="text-muted-foreground">Manage and version control your training data</p>
                </div>
                <Button className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Dataset
                </Button>
            </div>

            <Card className="glass-card border-border/50 bg-card/50">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Dataset Name</TableHead>
                            <TableHead>Format</TableHead>
                            <TableHead>Size</TableHead>
                            <TableHead>Rows</TableHead>
                            <TableHead className="text-right">Last Updated</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {datasets.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                                    <div className="flex flex-col items-center gap-2">
                                        <Database className="h-8 w-8 text-muted-foreground/50" />
                                        <p>No datasets uploaded yet.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            datasets.map((ds) => (
                                <TableRow key={ds.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        {ds.name}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="uppercase text-[10px]">
                                            {ds.format || "JSONL"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{ds.size_bytes ? (ds.size_bytes / 1024 / 1024).toFixed(2) + " MB" : "-"}</TableCell>
                                    <TableCell>{ds.num_rows?.toLocaleString() || "-"}</TableCell>
                                    <TableCell className="text-right text-muted-foreground text-xs">
                                        {ds.updated_at ? new Date(ds.updated_at).toLocaleDateString() : "-"}
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
