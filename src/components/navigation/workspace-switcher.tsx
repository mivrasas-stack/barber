"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Check, ChevronsUpDown, Plus, Scissors } from "lucide-react";

export interface WorkspaceSummary {
  tenantId: string;
  name: string;
  slug: string;
  tenantType: "BUSINESS" | "SOLO_PROFESSIONAL";
  role: string;
  isCurrent: boolean;
}

export function WorkspaceSwitcher() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [current, setCurrent] = useState<WorkspaceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    async function loadWorkspaces() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/v1/workspaces");
        if (res.ok) {
          const data = await res.json();
          setWorkspaces(data.workspaces || []);
          const active = data.workspaces?.find((w: WorkspaceSummary) => w.isCurrent) || data.workspaces?.[0];
          setCurrent(active || null);
        }
      } catch (err) {
        console.error("Failed to load workspaces", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadWorkspaces();
  }, []);

  const handleSwitch = async (targetTenantId: string, tenantType: string) => {
    if (targetTenantId === current?.tenantId) return;
    try {
      setIsSwitching(true);
      const res = await fetch("/api/v1/workspaces/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetTenantId }),
      });
      if (res.ok) {
        if (tenantType === "SOLO_PROFESSIONAL") {
          router.push("/professional");
        } else {
          router.push("/barber");
        }
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to switch workspace", err);
    } finally {
      setIsSwitching(false);
    }
  };

  if (isLoading || !current) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/40 bg-muted/20 text-xs text-muted-foreground animate-pulse">
        <Building2 className="w-4 h-4" />
        <span>Cargando espacio...</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 border-border/60 bg-background/80 hover:bg-muted/40 h-9 px-3 text-xs font-medium"
          disabled={isSwitching}
        >
          {current.tenantType === "SOLO_PROFESSIONAL" ? (
            <Scissors className="w-3.5 h-3.5 text-amber-500" />
          ) : (
            <Building2 className="w-3.5 h-3.5 text-blue-500" />
          )}
          <span className="font-semibold text-foreground max-w-[140px] truncate">
            {current.name}
          </span>
          <Badge
            variant="secondary"
            className="text-[10px] uppercase tracking-wider py-0 px-1.5 font-mono"
          >
            {current.tenantType === "SOLO_PROFESSIONAL" ? "Solo" : "Sede"}
          </Badge>
          <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground ml-auto opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tus Espacios de Trabajo
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((ws) => {
          const isSelected = ws.tenantId === current.tenantId;
          return (
            <DropdownMenuItem
              key={ws.tenantId}
              onClick={() => handleSwitch(ws.tenantId, ws.tenantType)}
              className="flex items-center justify-between py-2 cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                {ws.tenantType === "SOLO_PROFESSIONAL" ? (
                  <Scissors className="w-4 h-4 text-amber-500 shrink-0" />
                ) : (
                  <Building2 className="w-4 h-4 text-blue-500 shrink-0" />
                )}
                <div className="flex flex-col truncate">
                  <span className="text-xs font-medium text-foreground truncate">
                    {ws.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Rol: {ws.role}
                  </span>
                </div>
              </div>
              {isSelected && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push("/register/professional")}
          className="flex items-center gap-2 text-xs text-primary font-medium cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Registrar nuevo espacio solo</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
