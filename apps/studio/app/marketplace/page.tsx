"use client";

import { useEffect, useState } from "react";
import { MarketplaceAPI } from "@/lib/api";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ShoppingBag, TrendingUp, Star, Download, Shield } from "lucide-react";

export default function MarketplacePage() {
    const [trending, setTrending] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchTrending = async () => {
            try {
                const data = await MarketplaceAPI.getTrending();
                if (Array.isArray(data)) {
                    setTrending(data);
                }
                setLoading(false);
            } catch (error) {
                console.error("Failed to load marketplace", error);
                setLoading(false);
            }
        };

        fetchTrending();
    }, []);

    const handleSearch = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            setLoading(true);
            try {
                const data = await MarketplaceAPI.search(searchQuery);
                if (Array.isArray(data)) {
                    setTrending(data); // Reusing trending state for search results for simplicity
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
    }

    if (loading) return <div className="p-8 animate-pulse text-muted-foreground">Loading marketplace...</div>;

    return (
        <div className="p-8 space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-4 mb-12">
                <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                    OpenAgency Marketplace
                </h1>
                <p className="text-lg text-muted-foreground">
                    Discover, buy, and sell high-quality LoRA adapters and agentic skills.
                </p>
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Search for 'coding assistant', 'medical', 'legal'..."
                        className="pl-10 h-12 bg-background/50 border-primary/20 focus:border-primary transition-all text-lg"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearch}
                    />
                </div>
            </div>

            <div>
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-purple-400" />
                    Trending Now
                </h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {trending.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                            No items found. Be the first to publish!
                        </div>
                    ) : (
                        trending.map((item) => (
                            <Card key={item.id} className="glass-card border-border/50 bg-card/50 flex flex-col hover:border-purple-500/50 transition-colors group">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <Badge variant="secondary" className="mb-2 bg-gradient-to-r from-purple-500/10 to-blue-500/10 text-purple-300 border-purple-500/20">
                                            {item.category || "General"}
                                        </Badge>
                                        <div className="flex gap-1 text-yellow-500">
                                            <Star className="h-3 w-3 fill-current" />
                                            <span className="text-[10px] text-muted-foreground">{item.rating || "4.8"}</span>
                                        </div>
                                    </div>
                                    <CardTitle className="line-clamp-1 group-hover:text-purple-400 transition-colors">{item.name}</CardTitle>
                                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5em]">
                                        {item.description || "High performance adapter for task specific operations."}
                                    </p>
                                </CardHeader>
                                <CardFooter className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Download className="h-3 w-3" />
                                        {item.downloads || "1.2k"}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {item.price ? (
                                            <span className="font-bold text-sm">${item.price}</span>
                                        ) : (
                                            <span className="font-bold text-sm text-emerald-400">Free</span>
                                        )}
                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                            <ShoppingBag className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardFooter>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
