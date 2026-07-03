import Link from "next/link";
import { Sparkles, History } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div
        className="blob -top-40 -left-32 size-96 bg-[oklch(0.58_0.22_296)]"
        style={{ animationDelay: "0s" }}
      />
      <div
        className="blob top-1/3 -right-32 size-96 bg-[oklch(0.65_0.2_340)]"
        style={{ animationDelay: "-6s" }}
      />
      <div
        className="blob bottom-0 left-1/3 size-96 bg-[oklch(0.7_0.18_200)]"
        style={{ animationDelay: "-12s" }}
      />

      <header className="relative z-10 flex items-center justify-between border-b border-border/50 px-6 py-4 backdrop-blur-sm sm:px-10">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <Sparkles className="size-5 text-primary" />
          <span>
            Criar<span className="gradient-text">Conteúdo</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/"
            className="rounded-lg px-3 py-2 font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
          >
            Novo conteúdo
          </Link>
          <Link
            href="/jobs"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
          >
            <History className="size-4" /> Histórico
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:px-10">
        {children}
      </main>
    </div>
  );
}
