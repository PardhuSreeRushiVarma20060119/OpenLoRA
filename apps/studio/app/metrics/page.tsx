"use client";

import { useEffect, useState } from "react";
import { MetricsAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Activity, Server, Database, Cpu, Zap } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";

interface MetricStatProps {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    unit?: string;
    iconColor?: string;
    iconBg?: string;
}

function MetricStat({ icon: Icon, label, value, unit, iconColor = "text-blue-400", iconBg = "bg-blue-400/10" }: MetricStatProps) {
    return (
        <Card className="glass-card border-border/50 bg-card/50">
            <CardContent className="p-5 flex items-center gap-4">
                <div className={cn("p-3 rounded-xl shrink-0", iconBg)}>
                    <Icon className={cn("h-5 w-5", iconColor)} />
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                    <p className="text-xl font-bold text-foreground mt-0.5">
                        {value}
                        {unit && <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

export default function MetricsPage() {
    const [recentMetrics, setRecentMetrics] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const data = await MetricsAPI.getRecent();
                if (Array.isArray(data)) setRecentMetrics(data);
            } catch (err) {
                // empty state shown
                console.error("[Metrics] Failed to fetch:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
        const interval = setInterval(fetchMetrics, 5000);
        return () => clearInterval(interval);
    }, []);

    const chartData = recentMetrics
        .map((batch) => ({
            time: batch.timestamp ? new Date(batch.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—",
            gpu: batch.metrics?.gpu_util ?? null,
            cpu: batch.metrics?.cpu_util ?? null,
        }))
        .reverse();

    const displayData = chartData.length > 0
        ? chartData
        : [{ time: "—", gpu: 0, cpu: 0 }];

    if (loading) return (
        <div className="p-6 md:p-8 space-y-6 animate-fade-in">
            <div className="skeleton h-7 w-40" />
            <div className="grid gap-4 sm:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                    <Card key={i} className="glass-card border-border/50 bg-card/50">
                        <CardContent className="p-5">
                            <div className="skeleton h-16 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Card className="glass-card border-border/50 bg-card/50">
                <CardContent className="p-6">
                    <div className="skeleton h-[380px] w-full" />
                </CardContent>
            </Card>
        </div>
    );

    return (
        <div className="p-6 md:p-8 space-y-6 animate-fade-in-up">
            <PageHeader
                title="System Metrics"
                description="Real-time cluster observability and performance monitoring"
            />

            {/* Stats row */}
            <div className="grid gap-4 sm:grid-cols-3">
                <MetricStat
                    icon={Activity}
                    label="Ingestion Rate"
                    value="4.2k"
                    unit="pts/sec"
                    iconColor="text-blue-400"
                    iconBg="bg-blue-400/10"
                />
                <MetricStat
                    icon={Server}
                    label="Active Collectors"
                    value="12"
                    iconColor="text-emerald-400"
                    iconBg="bg-emerald-400/10"
                />
                <MetricStat
                    icon={Database}
                    label="Storage Used"
                    value="1.2"
                    unit="GB"
                    iconColor="text-violet-400"
                    iconBg="bg-violet-400/10"
                />
            </div>

            {/* Main chart */}
            <Card className="glass-card border-border/50 bg-card/50">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold text-foreground">
                            Cluster Resource Utilization (Live)
                        </CardTitle>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-400" />GPU
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400" />CPU
                            </span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pb-6">
                    <ResponsiveContainer width="100%" height={360}>
                        <LineChart data={displayData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                            <XAxis
                                dataKey="time"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: "hsl(var(--muted-foreground))" }}
                            />
                            <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: "hsl(var(--muted-foreground))" }}
                                tickFormatter={(v) => `${v}%`}
                                width={36}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "hsl(var(--card))",
                                    borderColor: "hsl(var(--border))",
                                    borderRadius: "8px",
                                    fontSize: 12,
                                }}
                                itemStyle={{ color: "hsl(var(--foreground))" }}
                                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                            />
                            <Line type="monotone" dataKey="gpu" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "hsl(217 91% 60%)" }} />
                            <Line type="monotone" dataKey="cpu" stroke="hsl(158 64% 52%)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "hsl(158 64% 52%)" }} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
