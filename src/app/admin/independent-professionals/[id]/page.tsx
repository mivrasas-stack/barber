"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Scissors,
  ArrowLeft,
  Building2,
  CreditCard,
  Layers,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Sparkles,
  Save,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PremiumButton } from "@/components/ui/premium-button";

export default function AdminIndependentProfessionalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [overrideReason, setOverrideReason] = useState("");
  const [savingModuleId, setSavingModuleId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/v1/admin/independent-professionals/${id}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOverride = async (moduleId: string, state: "FORCE_ENABLED" | "FORCE_DISABLED" | "CLEAR") => {
    try {
      setSavingModuleId(moduleId);
      const res = await fetch(`/api/v1/admin/independent-professionals/${id}/modules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          state: state === "CLEAR" ? null : state,
          reason: overrideReason || `Admin override by Platform Administrator`,
        }),
      });
      if (res.ok) {
        await loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Error al actualizar módulo");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingModuleId(null);
    }
  };

  const handleToggleSuspend = async () => {
    if (!data?.workspace) return;
    const isSuspended = data.workspace.status === "SUSPENDED";
    const confirm = window.confirm(
      isSuspended
        ? "¿Deseas reactivar el workspace de este profesional?"
        : "¿Deseas suspender el workspace de este profesional? No podrá recibir citas."
    );
    if (!confirm) return;

    try {
      const res = await fetch(`/api/v1/admin/independent-professionals/${id}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suspend: !isSuspended,
          reason: isSuspended ? "Reactivado por Admin" : "Suspendido por Admin",
        }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="container mx-auto px-6 py-12 text-center text-xs text-muted-foreground animate-pulse">
        Cargando expediente del profesional...
      </div>
    );
  }

  const { profile, workspace, subscription, plan, affiliations, effectiveModules, overrides } = data;

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl space-y-8">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="sm" className="h-9 w-9 p-0">
            <Link href="/admin/independent-professionals">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-headline font-bold text-foreground">
                {profile.displayName}
              </h1>
              <Badge
                variant="outline"
                className={`text-[10px] py-0 ${
                  workspace.status === "ACTIVE"
                    ? "text-emerald-500 border-emerald-500/30"
                    : "text-destructive border-destructive/30"
                }`}
              >
                {workspace.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              Slug: /{profile.professionalSlug} • Workspace: {workspace.tenantId}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant={workspace.status === "ACTIVE" ? "destructive" : "default"}
            size="sm"
            onClick={handleToggleSuspend}
            className="text-xs"
          >
            {workspace.status === "ACTIVE" ? "Suspender Workspace" : "Reactivar Workspace"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="modules" className="space-y-6">
        <TabsList className="bg-muted/30 border border-border/40 p-1">
          <TabsTrigger value="modules" className="text-xs">
            <Layers className="w-3.5 h-3.5 mr-1.5" />
            Módulos & Entitlements
          </TabsTrigger>
          <TabsTrigger value="overview" className="text-xs">
            <Shield className="w-3.5 h-3.5 mr-1.5" />
            Expediente General
          </TabsTrigger>
          <TabsTrigger value="subscription" className="text-xs">
            <CreditCard className="w-3.5 h-3.5 mr-1.5" />
            Suscripción
          </TabsTrigger>
          <TabsTrigger value="affiliations" className="text-xs">
            <Building2 className="w-3.5 h-3.5 mr-1.5" />
            Afiliaciones ({affiliations?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Modules Tab */}
        <TabsContent value="modules" className="space-y-6">
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1 text-xs">
            <span className="font-semibold text-foreground">
              Separación Estricta: Module Entitlement vs RBAC
            </span>
            <p className="text-muted-foreground">
              Los módulos habilitados definen las capacidades contratadas en el plan del profesional. Los administradores de plataforma pueden forzar la activación o desactivación individual de módulos con auditoría.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/60 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/40 bg-muted/20 text-[11px] font-mono uppercase text-muted-foreground">
                  <th className="py-3 px-4">Módulo</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4">Origen</th>
                  <th className="py-3 px-4">Estado Efectivo</th>
                  <th className="py-3 px-4 text-right">Override Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30 text-xs">
                {effectiveModules?.map((item: any) => {
                  const m = item.module;
                  const isCore = m.isMandatoryCore;
                  const isSaving = savingModuleId === m.id;

                  return (
                    <tr key={m.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          {isCore && <Lock className="w-3 h-3 text-muted-foreground" />}
                          <span>{m.name}</span>
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground">
                          {m.code}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground">
                        {m.category}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className="text-[10px] font-mono py-0">
                          {item.source}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4">
                        {item.isEnabled ? (
                          <span className="text-emerald-500 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Habilitado
                          </span>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 text-muted-foreground/60" /> Deshabilitado
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {isCore ? (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            Core Bloqueado
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {item.source === "ADMIN_OVERRIDE" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] text-amber-500"
                                disabled={isSaving}
                                onClick={() => handleOverride(m.id, "CLEAR")}
                              >
                                Limpiar Override
                              </Button>
                            ) : item.isEnabled ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] text-destructive hover:bg-destructive/10"
                                disabled={isSaving}
                                onClick={() => handleOverride(m.id, "FORCE_DISABLED")}
                              >
                                Forzar Off
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] text-emerald-500 hover:bg-emerald-500/10"
                                disabled={isSaving}
                                onClick={() => handleOverride(m.id, "FORCE_ENABLED")}
                              >
                                Forzar On
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="p-6 rounded-2xl border border-border/60 bg-background/60 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-3">
              <h3 className="font-headline font-bold text-base text-foreground">Datos del Perfil</h3>
              <div><span className="text-muted-foreground">Nombre:</span> <strong className="text-foreground ml-1">{profile.displayName}</strong></div>
              <div><span className="text-muted-foreground">Slug Público:</span> <strong className="text-amber-500 ml-1 font-mono">/{profile.professionalSlug}</strong></div>
              <div><span className="text-muted-foreground">Bio:</span> <p className="text-foreground mt-0.5">{profile.bio || "Sin biografía"}</p></div>
              <div><span className="text-muted-foreground">Experiencia:</span> <span className="text-foreground ml-1">{profile.yearsExperience || 0} años</span></div>
              <div><span className="text-muted-foreground">Instagram:</span> <span className="text-foreground ml-1">{profile.instagram || "N/A"}</span></div>
            </div>

            <div className="space-y-3">
              <h3 className="font-headline font-bold text-base text-foreground">Entidad Comercial (Solo Workspace)</h3>
              <div><span className="text-muted-foreground">Tenant ID:</span> <span className="font-mono text-foreground ml-1">{workspace.tenantId}</span></div>
              <div><span className="text-muted-foreground">Tipo de Tenant:</span> <Badge variant="secondary" className="ml-1 text-[10px]">SOLO_PROFESSIONAL</Badge></div>
              <div><span className="text-muted-foreground">Estado Workspace:</span> <strong className="text-emerald-500 ml-1">{workspace.status}</strong></div>
              <div><span className="text-muted-foreground">Reservas Públicas:</span> <span className="text-foreground ml-1">{profile.bookingEnabled ? "Habilitadas" : "Deshabilitadas"}</span></div>
            </div>
          </div>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-4">
          <div className="p-6 rounded-2xl border border-border/60 bg-background/60 space-y-4 text-xs">
            <h3 className="font-headline font-bold text-base text-foreground">Plan y Facturación</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-border/40 bg-muted/20">
                <span className="text-muted-foreground text-[11px]">Plan Activo</span>
                <div className="font-bold text-base text-foreground mt-1">{plan?.name || "Solo Pro"}</div>
              </div>
              <div className="p-4 rounded-xl border border-border/40 bg-muted/20">
                <span className="text-muted-foreground text-[11px]">Estado</span>
                <div className="font-bold text-base text-amber-500 mt-1">{subscription?.status || "ACTIVE"}</div>
              </div>
              <div className="p-4 rounded-xl border border-border/40 bg-muted/20">
                <span className="text-muted-foreground text-[11px]">Tarifa</span>
                <div className="font-bold text-base text-foreground mt-1">${((plan?.priceMinor || 8900000) / 100).toLocaleString()} COP</div>
              </div>
              <div className="p-4 rounded-xl border border-border/40 bg-muted/20">
                <span className="text-muted-foreground text-[11px]">Trial Fin</span>
                <div className="font-bold text-base text-foreground mt-1">14 Días</div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Affiliations Tab */}
        <TabsContent value="affiliations" className="space-y-4">
          <div className="p-6 rounded-2xl border border-border/60 bg-background/60 space-y-4">
            <h3 className="font-headline font-bold text-base text-foreground">Barberías Anfitrionas Vinculadas</h3>
            {affiliations?.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tiene afiliaciones registradas.</p>
            ) : (
              affiliations?.map((aff: any) => (
                <div key={aff.id} className="p-4 rounded-xl border border-border/40 bg-muted/20 text-xs flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="font-bold text-foreground">Host Tenant: {aff.hostTenantId}</span>
                    <div className="text-muted-foreground">Modelo: {aff.relationshipType}</div>
                  </div>
                  <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 text-[10px]">
                    {aff.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
