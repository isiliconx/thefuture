import type { Metadata } from "next";
import "./globals.css";

const githubPages = process.env.GITHUB_PAGES === "true";

export const metadata: Metadata = {
  title: "THE FUTURE — A History of Wonder",
  description: "A cinematic 3D odyssey through the history of science. From the first spark of curiosity to a future shaped by superintelligence.",
  metadataBase: new URL(githubPages ? "https://isiliconx.github.io/thefuture/" : "https://thefuture-science-journey.noisy-moose-6475.chatgpt.site"),
  icons: { icon: githubPages ? "/thefuture/favicon.svg" : "/favicon.svg" },
  openGraph: { title: "THE FUTURE — A History of Wonder", description: "Eight chapters. One extraordinary story of human curiosity.", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
