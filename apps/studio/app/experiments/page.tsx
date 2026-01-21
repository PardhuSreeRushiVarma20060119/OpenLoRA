"use client";

import { useEffect, useState } from "react";
import { ExperimentsAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Beaker } from "lucide-react";

export default function ExperimentsPage() {
    const [experiments, setExperiments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchExperiments = async () => {
            try {
                const data = await ExperimentsAPI.list();
                if (Array.isArray(data)) {
                    setExperiments(data);
                }
                setLoading(false);
            } catch (error) {
                console.error("Failed to load experiments", error);
                setLoading(false);
            }
        };

        fetchExperiments();
    }, []);

    if (loading) return <div className="p-8 animate-pulse text-muted-foreground">Loading experiments...</div>;

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Experiments</h1>
                    <p className="text-muted-foreground">Track training runs and evaluation metrics</p>
                </div>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Experiment
                </Button>
            </div>

            <Card className="glass-card border-border/50 bg-card/50">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Experiment ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Runs</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Created</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {experiments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                                    <div className="flex flex-col items-center gap-2">
                                        <Beaker className="h-8 w-8 text-muted-foreground/50" />
                                        <p>No experiments found. Start a new one to track your models.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            experiments.map((exp) => (
                                <TableRow key={exp.id}>
                                    <TableCell className="font-mono text-xs">{exp.id.substring(0, 8)}...</TableCell>
                                    <TableCell className="font-medium">{exp.name || "Untitled Experiment"}</TableCell>
                                    <TableCell>{exp.run_count || 0}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-primary/10 hover:bg-primary/20">
                                            {exp.status || "Active"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground text-xs">
                                        {new Date(exp.created_at).toLocaleDateString()}
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
