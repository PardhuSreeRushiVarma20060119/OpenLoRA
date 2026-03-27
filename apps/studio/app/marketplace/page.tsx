"use client";

import { useEffect, useState } from "react";
import { MarketplaceAPI } from "@/lib/api";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ShoppingBag, TrendingUp, Star, Download, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

export default function MarketplacePage() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        MarketplaceAPI.getTrending()
            .then((data) => { if (Array.isArray(data)) setItems(data); })
            .catch((err) => { console.error("[Marketplace] Failed to load trending:", err); })
            .finally(() => setLoading(false));
    }, []);

    const handleSearch = async (e: React.KeyboardEvent) => {
        if (e.key !== "Enter" || !searchQuery.trim()) return;
        setLoading(true);
        try {
            const data = await MarketplaceAPI.search(searchQuery);
            if (Array.isArray(data)) setItems(data);
        } catch (err) {
            console.error("[Marketplace] Search failed:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-10 animate-fade-in-up">
            {/* Hero */}
            <div className="text-center max-w-2xl mx-auto space-y-4 pt-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-medium mb-2">
                    <Sparkles className="h-3 w-3" />
                    OpenAgency Marketplace
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-gradient-brand">
                    Discover & Deploy Adapters
                </h1>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    Browse, buy, and share high-quality LoRA adapters and agentic skill packs.
                </p>
                <div className="relative max-w-lg mx-auto mt-6">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder="Search 'coding assistant', 'medical', 'legal'…"
                        className="pl-10 h-11 bg-muted/40 border-border/60 text-sm focus:border-blue-400/50 transition-colors"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearch}
                    />
                    <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:block text-[10px] text-muted-foreground/60 border border-border/60 rounded px-1.5 py-0.5 font-mono">
                        Enter ↵
                    </kbd>
                </div>
            </div>

            {/* Grid */}
            <section>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-400" />
                    Trending Now
                </h2>

                {loading ? (
                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {[...Array(8)].map((_, i) => (
                            <Card key={i} className="glass-card border-border/50 bg-card/50">
                                <div className="p-5 space-y-3">
                                    <div className="skeleton h-5 w-20 rounded-full" />
                                    <div className="skeleton h-4 w-full" />
                                    <div className="skeleton h-3 w-full" />
                                    <div className="skeleton h-3 w-2/3" />
                                </div>
                                <div className="px-5 pb-5">
                                    <div className="skeleton h-8 w-full rounded-lg" />
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <EmptyState
                        icon={ShoppingBag}
                        title="Nothing found"
                        description="Be the first to publish an adapter!"
                    />
                ) : (
                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {items.map((item) => (
                            <Card
                                key={item.id}
                                className={cn(
                                    "glass-card border-border/50 bg-card/50 flex flex-col",
                                    "hover:border-purple-400/30 hover:shadow-glow-violet transition-all duration-200"
                                )}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <Badge variant="outline" className="text-[10px] font-medium border-purple-500/30 bg-purple-500/10 text-purple-300">
                                            {item.category || "General"}
                                        </Badge>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                                            <span className="text-[10px] text-muted-foreground">{item.rating || "4.8"}</span>
                                        </div>
                                    </div>
                                    <CardTitle className="text-sm font-semibold line-clamp-1 group-hover:text-purple-300 transition-colors">
                                        {item.name}
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5em] mt-1">
                                        {item.description || "High-performance adapter for specialized tasks."}
                                    </p>
                                </CardHeader>
                                <CardFooter className="mt-auto pt-4 border-t border-border/40 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Download className="h-3 w-3" />
                                        {item.downloads || "1.2k"}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {item.price ? (
                                            <span className="text-sm font-bold text-foreground">${item.price}</span>
                                        ) : (
                                            <span className="text-xs font-semibold text-emerald-400">Free</span>
                                        )}
                                        <Button size="sm" className="h-7 px-2.5 text-xs bg-purple-600 hover:bg-purple-700 text-white gap-1">
                                            <ShoppingBag className="h-3 w-3" />
                                            Get
                                        </Button>
                                    </div>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
