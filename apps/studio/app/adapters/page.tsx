"use client";

import { useEffect, useState } from "react";
import { AdaptersAPI } from "@/lib/api";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, Star, GitBranch, GitFork } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

export default function AdaptersPage() {
    const [adapters, setAdapters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        AdaptersAPI.list()
            .then((data) => { if (Array.isArray(data)) setAdapters(data); })
            .catch((err) => { console.error("[Adapters] Failed to load:", err); })
            .finally(() => setLoading(false));
    }, []);

    const filtered = adapters.filter(a =>
        a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="p-6 md:p-8 space-y-6 animate-fade-in">
            <div className="skeleton h-7 w-40" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                    <Card key={i} className="glass-card border-border/50 bg-card/50">
                        <div className="p-5 space-y-3">
                            <div className="skeleton h-5 w-16 rounded-full" />
                            <div className="skeleton h-5 w-full" />
                            <div className="skeleton h-3 w-full" />
                            <div className="skeleton h-3 w-2/3" />
                        </div>
                        <div className="px-5 pb-5 flex gap-2">
                            <div className="skeleton h-8 flex-1 rounded-lg" />
                            <div className="skeleton h-8 flex-1 rounded-lg" />
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );

    return (
        <div className="p-6 md:p-8 space-y-6 animate-fade-in-up">
            <PageHeader
                title="My Adapters"
                description="Fine-tuned LoRA adapters registry"
                action={
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder="Search adapters…"
                            className="pl-8 h-9 bg-muted/40 border-border/60 text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                }
            />

            {filtered.length === 0 ? (
                <EmptyState
                    icon={GitBranch}
                    title={searchTerm ? "No adapters match your search" : "No adapters yet"}
                    description={searchTerm ? "Try a different search term." : "Train your first model to create an adapter."}
                />
            ) : (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filtered.map((adapter) => (
                        <Card
                            key={adapter.id}
                            className={cn(
                                "glass-card border-border/50 bg-card/50 flex flex-col",
                                "hover:border-orange-400/30 hover:shadow-card-lg transition-all duration-200"
                            )}
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <Badge variant="outline" className="text-[10px] font-medium border-border/60 text-muted-foreground">
                                        {adapter.base_model || "Unknown Base"}
                                    </Badge>
                                    <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                                        <Star className="h-3 w-3" />
                                        <span className="text-[10px]">{adapter.likes || 0}</span>
                                    </div>
                                </div>
                                <CardTitle className="text-sm font-semibold text-foreground line-clamp-1">
                                    {adapter.name}
                                </CardTitle>
                                <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5em] mt-1">
                                    {adapter.description || "No description provided."}
                                </p>
                            </CardHeader>
                            <CardContent className="flex-1 py-0">
                                {(adapter.tags || []).length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {(adapter.tags as string[]).slice(0, 3).map((tag) => (
                                            <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-400/10 text-orange-400 border border-orange-400/20">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="pt-4 pb-4 gap-2 border-t border-border/40 mt-4">
                                <Button variant="outline" size="sm" className="flex-1 text-xs h-8 border-border/60">
                                    <GitFork className="h-3 w-3 mr-1.5" />
                                    Details
                                </Button>
                                <Button size="sm" className="flex-1 text-xs h-8 bg-orange-600 hover:bg-orange-700 text-white">
                                    <Download className="h-3 w-3 mr-1.5" />
                                    Pull
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
