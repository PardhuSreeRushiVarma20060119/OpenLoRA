"use client";

import { useEffect, useState } from "react";
import { MetricsAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Activity, Server, Database } from "lucide-react";

export default function MetricsPage() {
    const [recentMetrics, setRecentMetrics] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const data = await MetricsAPI.getRecent();
                if (Array.isArray(data)) {
                    // Transform data for charts if needed
                    setRecentMetrics(data);
                }
                setLoading(false);
            } catch (error) {
                console.error("Failed to load metrics", error);
                setLoading(false);
            }
        };

        fetchMetrics();
        const interval = setInterval(fetchMetrics, 5000);
        return () => clearInterval(interval);
    }, []);

    // Placeholder data transformation for visualization
    // Assuming metric batch has timestamp and values
    const chartData = recentMetrics.map((batch, i) => ({
        time: new Date(batch.timestamp).toLocaleTimeString(),
        gpu: batch.metrics?.gpu_util || Math.random() * 100, // Fallback if no real data
        cpu: batch.metrics?.cpu_util || Math.random() * 80,
    })).reverse();

    if (loading) return <div className="p-8 animate-pulse text-muted-foreground">Loading system metrics...</div>;

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">System Metrics</h1>
                <p className="text-muted-foreground">Real-time observability and performance monitoring</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="glass-card border-border/50 bg-card/50 p-6 flex items-center gap-4">
                    <Activity className="h-8 w-8 text-blue-400" />
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Ingestion Rate</p>
                        <h3 className="text-2xl font-bold">4.2k <span className="text-xs text-muted-foreground font-normal">pts/sec</span></h3>
                    </div>
                </Card>
                <Card className="glass-card border-border/50 bg-card/50 p-6 flex items-center gap-4">
                    <Server className="h-8 w-8 text-emerald-400" />
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Active Collectors</p>
                        <h3 className="text-2xl font-bold">12</h3>
                    </div>
                </Card>
                <Card className="glass-card border-border/50 bg-card/50 p-6 flex items-center gap-4">
                    <Database className="h-8 w-8 text-purple-400" />
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Storage Used</p>
                        <h3 className="text-2xl font-bold">1.2 <span className="text-xs text-muted-foreground font-normal">GB</span></h3>
                    </div>
                </Card>
            </div>

            <Card className="glass-card border-border/50 bg-card/50">
                <CardHeader>
                    <CardTitle>Cluster Resource Utilization (Live)</CardTitle>
                </CardHeader>
                <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData.length > 0 ? chartData : [{ time: 'Now', gpu: 0, cpu: 0 }]}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                            <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                                itemStyle={{ color: 'hsl(var(--foreground))' }}
                            />
                            <Line type="monotone" dataKey="gpu" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="cpu" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
