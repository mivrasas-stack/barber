"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Shield, User, CreditCard, Bell, Key, Trash2 } from "lucide-react";
import { dummyUsers } from "../data";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Ajustes de Plataforma" />

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="bg-black/40 backdrop-blur-xl border border-border p-1 rounded-full text-zinc-400 h-auto">
          <TabsTrigger value="profile" className="rounded-full data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-500 data-[state=active]:shadow-none transition-all py-2 px-4">
            <User className="w-4 h-4 mr-2" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="users" className="rounded-full data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-500 data-[state=active]:shadow-none transition-all py-2 px-4">
            <Shield className="w-4 h-4 mr-2" />
            Usuarios y Roles
          </TabsTrigger>
          <TabsTrigger value="billing" className="rounded-full data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-500 data-[state=active]:shadow-none transition-all py-2 px-4">
            <CreditCard className="w-4 h-4 mr-2" />
            Facturación
          </TabsTrigger>
        </TabsList>

        <div className="mt-8">
          <TabsContent value="profile" className="focus-visible:outline-none focus-visible:ring-0">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="bg-black/40 backdrop-blur-xl border border-border rounded-2xl p-6 shadow-2xl">
                <h3 className="text-lg font-medium text-foreground mb-4 flex items-center"><User className="w-5 h-5 mr-2 text-amber-500"/> Información Personal</h3>
                <p className="text-sm text-zinc-400">Ajustes básicos de tu cuenta y perfil público.</p>
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Nombre</label>
                    <div className="bg-foreground/5 border border-border rounded-lg p-3 text-foreground">Juan Pérez</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Email</label>
                    <div className="bg-foreground/5 border border-border rounded-lg p-3 text-foreground">juan@example.com</div>
                  </div>
                </div>
              </div>

              <div className="bg-black/40 backdrop-blur-xl border border-border rounded-2xl p-6 shadow-2xl">
                <h3 className="text-lg font-medium text-foreground mb-4 flex items-center"><Bell className="w-5 h-5 mr-2 text-amber-500"/> Notificaciones</h3>
                <p className="text-sm text-zinc-400 mb-6">Administra tus preferencias de alertas.</p>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-foreground/5 border border-border rounded-xl">
                    <div>
                      <div className="font-medium text-foreground text-sm">Alertas por Email</div>
                      <div className="text-xs text-zinc-500">Recibe resúmenes diarios</div>
                    </div>
                    <div className="w-10 h-5 bg-amber-500/20 rounded-full flex items-center p-0.5 border border-amber-500/50 cursor-pointer">
                      <div className="w-4 h-4 bg-amber-500 rounded-full translate-x-5 transition-transform shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-foreground/5 border border-border rounded-xl">
                    <div>
                      <div className="font-medium text-foreground text-sm">Notificaciones Push</div>
                      <div className="text-xs text-zinc-500">Avisos instantáneos en la app</div>
                    </div>
                    <div className="w-10 h-5 bg-foreground/10 rounded-full flex items-center p-0.5 border border-border cursor-pointer">
                      <div className="w-4 h-4 bg-zinc-400 rounded-full transition-transform"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 bg-red-950/20 backdrop-blur-xl border border-red-900/30 rounded-2xl p-6 shadow-2xl">
                <h3 className="text-lg font-medium text-red-500 mb-2">Zona de Peligro</h3>
                <p className="text-sm text-red-400/70 mb-6">Acciones irreversibles sobre tu cuenta.</p>
                <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-foreground shadow-[0_0_15px_rgba(220,38,38,0.4)]">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar Cuenta Permanentemente
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users" className="focus-visible:outline-none focus-visible:ring-0">
            <div className="bg-black/40 backdrop-blur-xl border border-border rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-medium text-foreground">Gestión de Accesos</h3>
                  <p className="text-sm text-zinc-400">Controla quién tiene acceso al sistema.</p>
                </div>
                <Button className="bg-amber-500 hover:bg-amber-600 text-black font-medium shadow-[0_0_15px_rgba(245,158,11,0.3)] border-0">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Añadir Usuario
                </Button>
              </div>
              
              <div className="p-0">
                <Table>
                  <TableHeader className="bg-foreground/5 border-b border-border">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="text-zinc-400 font-medium h-12 px-6">Usuario</TableHead>
                      <TableHead className="text-zinc-400 font-medium h-12 px-6">Rol</TableHead>
                      <TableHead className="text-zinc-400 font-medium h-12 px-6">Último Acceso</TableHead>
                      <TableHead className="text-zinc-400 font-medium h-12 px-6 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dummyUsers.map((user) => (
                      <TableRow key={user.id} className="border-b border-border hover:bg-foreground/5 transition-colors">
                        <TableCell className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{user.name}</span>
                            <span className="text-xs text-zinc-500">{user.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge 
                            variant="outline" 
                            className={`border-0 ${
                              user.role === 'Admin' 
                                ? 'bg-amber-500/10 text-amber-500 shadow-[inset_0_0_10px_rgba(245,158,11,0.1)]' 
                                : 'bg-blue-500/10 text-blue-400'
                            }`}
                          >
                            <Key className="w-3 h-3 mr-1" />
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-zinc-400 text-sm">{user.lastLogin}</TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-foreground hover:bg-foreground/10">
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="billing" className="focus-visible:outline-none focus-visible:ring-0">
            <div className="bg-black/40 backdrop-blur-xl border border-border rounded-2xl p-6 shadow-2xl flex flex-col items-center justify-center min-h-[300px] text-center">
              <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
                <CreditCard className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-xl font-medium text-foreground mb-2">Módulo de Facturación</h3>
              <p className="text-zinc-400 max-w-md">
                El historial de pagos y la gestión de suscripciones se habilitarán próximamente.
              </p>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
