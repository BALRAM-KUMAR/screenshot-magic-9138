import { Link } from "@tanstack/react-router";
import { AudioLines } from "lucide-react";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/history", label: "History" },
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <AudioLines className="size-4" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            AudioSense <span className="text-muted-foreground">AI</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-right text-xs leading-tight sm:block">
            <span className="block font-medium">Research Workspace</span>
            <span className="text-muted-foreground">Free plan</span>
          </span>
          <span className="grid size-9 place-items-center rounded-full border bg-secondary text-sm font-medium">RS</span>
        </div>
      </div>
    </header>
  );
}
