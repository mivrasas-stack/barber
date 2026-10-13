"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Scissors,
  Plus,
  Search,
  Filter,
  Users,
  ShieldCheck,
  Building2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PremiumButton } from "@/components/ui/premium-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function AdminIndependentProfessionalsPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({
    total: 0,
    active: 0,
    trialing: 0,
    suspended: 0,
    withActiveAffiliation: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdAccess, setCreatedAccess] = useState<{
    email: string;
    temporaryPassword: string;
    accessEndsAt: string | null;
  } | null>(null);
  const [createForm, setCreateForm] = useState({
    email: "",
    name: "",
    displayName: "",
    professionalSlug: "",
    workspaceName: "",
    planCode: "SOLO_PRO",
    accessDuration: "MONTH",
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/admin/independent-professionals");
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
        setMetrics(json.metrics || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/admin/independent-professionals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      if (res.ok) {
        const payload = await res.json();
        setCreatedAccess({ ...payload.credentials, accessEndsAt: payload.accessEndsAt });
        await loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Error al crear profesional");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = data.filter((item) => {
    const matchesSearch =
      item.profile.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.profile.professionalSlug?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && item.workspace.status === "ACTIVE") ||
      (statusFilter === "SUSPENDED" && item.workspace.status === "SUSPENDED");
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold text-foreground">
                Barberos y Profesionales Independientes
              </h1>
              <p className="text-xs text-muted-foreground">
                Supervisión de workspaces solos, subscripciones, módulos habilitados y afiliaciones.
              </p>
            </div>
          </div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setCreatedAccess(null);
            setCreateForm({ email: "", name: "", displayName: "", professionalSlug: "", workspaceName: "", planCode: "SOLO_PRO", accessDuration: "MONTH" });
          }
        }}>
          <DialogTrigger asChild>
            <PremiumButton size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Provisionar Profesional
            </PremiumButton>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Provisionar Profesional Independiente</DialogTitle>
                <DialogDescription className="text-xs">
                  Crea la cuenta, sus credenciales seguras y un acceso temporal al plan seleccionado.
                </DialogDescription>
              </DialogHeader>

              {createdAccess ? (
                <div className="space-y-4 py-5 text-sm">
                  <p className="text-emerald-500 font-semibold">Profesional creado correctamente.</p>
                  <p className="text-xs text-muted-foreground">Copia estas credenciales ahora. La contraseña se muestra una sola vez y no se puede recuperar desde este formulario.</p>
                  <div className="space-y-1">
                    <Label className="text-xs">Usuario de acceso (correo)</Label>
                    <Input readOnly value={createdAccess.email} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Contraseña inicial generada</Label>
                    <Input readOnly value={createdAccess.temporaryPassword} aria-label="Contraseña inicial generada" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Acceso disponible hasta</Label>
                    <div className="rounded border border-border/60 p-2">{createdAccess.accessEndsAt ? new Date(createdAccess.accessEndsAt).toLocaleString("es-CO") : "No disponible"}</div>
                  </div>
                  <Button type="button" className="w-full" onClick={() => navigator.clipboard.writeText(`Usuario: ${createdAccess.email}\nContraseña: ${createdAccess.temporaryPassword}`)}>
                    Copiar credenciales
                  </Button>
                  <Button type="button" variant="outline" className="w-full" onClick={() => {
                    setIsCreateOpen(false);
                    setCreatedAccess(null);
                    setCreateForm({ email: "", name: "", displayName: "", professionalSlug: "", workspaceName: "", planCode: "SOLO_PRO", accessDuration: "MONTH" });
                  }}>
                    Cerrar
                  </Button>
                </div>
              ) : (
              <>
              <div className="space-y-3 py-3">
                <div className="space-y-1">
                  <Label htmlFor="c-email" className="text-xs">Email</Label>
                  <Input
                    id="c-email"
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="barbero@ejemplo.dev"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-name" className="text-xs">Nombre Personal</Label>
                  <Input
                    id="c-name"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="Carlos Mendoza"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-display" className="text-xs">Nombre Profesional</Label>
                  <Input
                    id="c-display"
                    required
                    value={createForm.displayName}
                    onChange={(e) => {
                      const val = e.target.value;
                      const slug = val.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
                      setCreateForm({
                        ...createForm,
                        displayName: val,
                        professionalSlug: slug,
                        workspaceName: `${val} Studio`,
                      });
                    }}
                    placeholder="Carlos 'The Barber' Mendoza"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-slug" className="text-xs">Slug Enlace</Label>
                  <Input
                    id="c-slug"
                    required
                    value={createForm.professionalSlug}
                    onChange={(e) => setCreateForm({ ...createForm, professionalSlug: e.target.value })}
                    placeholder="carlos-barber"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Plan Inicial</Label>
                  <select
                    className="w-full bg-background border border-border/60 rounded p-2 text-xs"
                    value={createForm.planCode}
                    onChange={(e) => setCreateForm({ ...createForm, planCode: e.target.value })}
                  >
                    <option value="SOLO_STARTER">Solo Starter ($49.000 COP)</option>
                    <option value="SOLO_PRO">Solo Pro ($89.000 COP)</option>
                    <option value="SOLO_ELITE">Solo Elite ($149.000 COP)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-duration" className="text-xs">Tiempo de acceso concedido</Label>
                  <select
                    id="c-duration"
                    className="w-full bg-background border border-border/60 rounded p-2 text-xs"
                    value={createForm.accessDuration}
                    onChange={(e) => setCreateForm({ ...createForm, accessDuration: e.target.value })}
                    required
                  >
                    <option value="DAY">1 día</option>
                    <option value="MONTH">1 mes</option>
                    <option value="YEAR">1 año</option>
                  </select>
                  <p className="text-[11px] text-muted-foreground">El acceso termina al cumplir este plazo y no se cobra automáticamente al vencer.</p>
                </div>
                <p className="text-[11px] text-muted-foreground">El correo será el usuario de inicio de sesión. Se generará una contraseña segura automáticamente.</p>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <PremiumButton type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? "Provisionando..." : "Crear Profesional"}
                </PremiumButton>
              </DialogFooter>
              </>
              )}
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl border border-border/60 bg-background/60">
          <span className="text-[11px] text-muted-foreground font-medium">Total Profesionales</span>
          <div className="text-2xl font-bold font-headline text-foreground mt-1">
            {metrics.total}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-border/60 bg-background/60">
          <span className="text-[11px] text-muted-foreground font-medium">Workspaces Activos</span>
          <div className="text-2xl font-bold font-headline text-emerald-500 mt-1">
            {metrics.active}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-border/60 bg-background/60">
          <span className="text-[11px] text-muted-foreground font-medium">En Período Trial</span>
          <div className="text-2xl font-bold font-headline text-amber-500 mt-1">
            {metrics.trialing}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-border/60 bg-background/60">
          <span className="text-[11px] text-muted-foreground font-medium">Con Sedes Afiliadas</span>
          <div className="text-2xl font-bold font-headline text-blue-500 mt-1">
            {metrics.withActiveAffiliation}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-border/60 bg-background/60">
          <span className="text-[11px] text-muted-foreground font-medium">Suspendidos</span>
          <div className="text-2xl font-bold font-headline text-destructive mt-1">
            {metrics.suspended}
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre profesional o slug..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {["ALL", "ACTIVE", "SUSPENDED"].map((st) => (
            <Button
              key={st}
              variant={statusFilter === st ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(st)}
              className="text-xs h-9 px-3"
            >
              {st === "ALL" ? "Todos" : st === "ACTIVE" ? "Activos" : "Suspendidos"}
            </Button>
          ))}
        </div>
      </div>

      {/* Professionals List Table */}
      <div className="rounded-2xl border border-border/60 bg-background/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20 text-[11px] font-mono uppercase text-muted-foreground">
                <th className="py-3 px-4">Profesional</th>
                <th className="py-3 px-4">Workspace Tenant</th>
                <th className="py-3 px-4">Plan & Subscripción</th>
                <th className="py-3 px-4">Afiliaciones</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No se encontraron profesionales independientes.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.profile.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-foreground">
                        {item.profile.displayName}
                      </div>
                      <div className="text-[11px] font-mono text-amber-500">
                        /{item.profile.professionalSlug}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {item.workspace.tenantId.substring(0, 8)}...
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[9px] py-0 ${
                          item.workspace.status === "ACTIVE"
                            ? "text-emerald-500 border-emerald-500/30"
                            : "text-destructive border-destructive/30"
                        }`}
                      >
                        {item.workspace.status}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-foreground">
                        {item.plan?.name || "Solo Pro"}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {item.subscription?.status || "ACTIVE"}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        {item.activeAffiliationsCount} activa(s)
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 border-border/60 hover:border-amber-500/40"
                      >
                        <Link href={`/admin/independent-professionals/${item.profile.id}`}>
                          Gestionar Módulos
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
