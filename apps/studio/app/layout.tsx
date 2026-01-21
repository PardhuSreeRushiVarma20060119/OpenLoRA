import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Using Inter for a clean premium look
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

const font = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "OpenLoRA Studio",
    description: "Advanced LoRA Management Platform",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={font.className}>
                <div className="h-full relative">
                    <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] bg-gray-900">
                        <Sidebar />
                    </div>
                    <main className="md:pl-72 h-full bg-[#030711]">
                        {children}
                    </main>
                </div>
            </body>
        </html>
    );
}
