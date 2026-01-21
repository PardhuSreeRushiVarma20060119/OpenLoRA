"use client";

import { useEffect, useState } from "react";
import { AdaptersAPI } from "@/lib/api";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, Star, GitFork } from "lucide-react";

export default function AdaptersPage() {
    const [adapters, setAdapters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchAdapters = async () => {
            try {
                const data = await AdaptersAPI.list();
                if (Array.isArray(data)) {
                    setAdapters(data);
                }
                setLoading(false);
            } catch (error) {
                console.error("Failed to load adapters", error);
                setLoading(false);
            }
        };

        fetchAdapters();
    }, []);

    const filteredAdapters = adapters.filter(a =>
        a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8 animate-pulse text-muted-foreground">Loading adapter registry...</div>;

    return (
        <div className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">My Adapters</h1>
                    <p className="text-muted-foreground">Manage your fine-tuned LoRA adapters</p>
                </div>
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search adapters..."
                        className="pl-8 bg-background/50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredAdapters.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        No adapters found matching your criteria.
                    </div>
                ) : (
                    filteredAdapters.map((adapter) => (
                        <Card key={adapter.id} className="glass-card border-border/50 bg-card/50 flex flex-col hover:bg-accent/5 transition-colors">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <Badge variant="outline" className="mb-2">{adapter.base_model || "Unknown Base"}</Badge>
                                    <div className="flex gap-1 text-muted-foreground">
                                        <Star className="h-3 w-3" /> <span className="text-[10px]">{adapter.likes || 0}</span>
                                    </div>
                                </div>
                                <CardTitle className="line-clamp-1" title={adapter.name}>{adapter.name}</CardTitle>
                                <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5em]">
                                    {adapter.description || "No description provided."}
                                </p>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <div className="flex gap-2 flex-wrap">
                                    {(adapter.tags || []).slice(0, 3).map((tag: string) => (
                                        <Badge key={tag} variant="secondary" className="text-[10px] h-5 px-1.5">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                            <CardFooter className="border-t border-border/50 pt-4 flex gap-2">
                                <Button variant="outline" size="sm" className="w-full text-xs">
                                    <GitFork className="h-3 w-3 mr-2" />
                                    Details
                                </Button>
                                <Button size="sm" className="w-full text-xs">
                                    <Download className="h-3 w-3 mr-2" />
                                    Download
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
