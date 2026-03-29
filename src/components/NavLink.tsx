import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface NavLinkProps {
  to: string;
  icon: ReactNode;
  children: ReactNode;
  mobile?: boolean;
}

export function NavLink({ to, icon, children, mobile }: NavLinkProps) {
  const { pathname } = useLocation();
  const isActive = pathname === to;

  if (mobile) {
    return (
      <Link
        to={to}
        className={cn(
          "p-2 rounded-lg transition-colors",
          isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        {icon}
      </Link>
    );
  }

  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
        isActive
          ? "bg-sidebar-accent text-sidebar-primary"
          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
      )}
    >
      {icon}
      {children}
    </Link>
  );
}
