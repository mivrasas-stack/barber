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
import { PlusCircle } from "lucide-react";
import { dummyUsers } from "../data";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Ajustes" />
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="users">Usuarios y Roles</TabsTrigger>
          <TabsTrigger value="billing">Facturación</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-6">
            <p>Aquí estarán los ajustes del perfil.</p>
        </TabsContent>
        <TabsContent value="users" className="mt-6">
            <div className="flex justify-end mb-4">
                <Button size="sm" className="gap-1">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Añadir Usuario
                </span>
                </Button>
            </div>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Correo Electrónico</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Último Acceso</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {dummyUsers.map((user) => (
                    <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                        <Badge variant={user.role === 'Admin' ? 'default' : 'secondary'}>{user.role}</Badge>
                    </TableCell>
                    <TableCell>{user.lastLogin}</TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </TabsContent>
        <TabsContent value="billing" className="mt-6">
            <p>Aquí estará la información de facturación.</p>
        </TabsContent>
      </Tabs>
    </>
  );
}
