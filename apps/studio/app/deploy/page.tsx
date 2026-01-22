"use client";

import { useEffect, useState } from "react";
import { DeployAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Rocket, Box, Activity, AlertCircle } from "lucide-react";

export default function DeployPage() {
    const [deployments, setDeployments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDeployments = async () => {
            try {
                const data = await DeployAPI.listDeployments();
                if (Array.isArray(data)) {
                    setDeployments(data);
                }
                setLoading(false);
            } catch (error) {
                console.error("Failed to load deployments", error);
                setLoading(false);
            }
        };

        fetchDeployments();
    }, []);

    if (loading) return <div className="p-8 animate-pulse text-muted-foreground">Loading specific deployments...</div>;

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Deployments</h1>
                    <p className="text-muted-foreground">Manage real-time inference endpoints</p>
                </div>
                <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                    <Rocket className="h-4 w-4" />
                    New Deployment
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3 mb-8">
                <Card className="glass-card border-border/50 bg-card/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Endpoints</CardTitle>
                        <Box className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{deployments.filter(d => d.status === 'active').length}</div>
                    </CardContent>
                </Card>
                <Card className="glass-card border-border/50 bg-card/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Requests (24h)</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">1.2M</div>
                        <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="glass-card border-border/50 bg-card/50">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Deployment Name</TableHead>
                            <TableHead>Model / Adapter</TableHead>
                            <TableHead>Environment</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Replicas</TableHead>
                            <TableHead className="text-right">Endpoint</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {deployments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                                    <div className="flex flex-col items-center gap-2">
                                        <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                                        <p>No active deployments found.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            deployments.map((d) => (
                                <TableRow key={d.id}>
                                    <TableCell className="font-medium">{d.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{d.model_id}</TableCell>
                                    <TableCell>{d.environment || "Production"}</TableCell>
                                    <TableCell>
                                        <Badge variant={d.status === 'active' ? 'default' : 'secondary'} className={d.status === 'active' ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" : ""}>
                                            {d.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{d.replicas || 1}</TableCell>
                                    <TableCell className="text-right font-mono text-xs">
                                        {d.endpoint_url || "https://api.openlora.dev/v1/..."}
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
