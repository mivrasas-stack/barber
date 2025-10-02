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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { dummyUsers, dummyBarbers } from "../data";
import { useState } from "react";
import type { Barber } from "@/lib/types";
import { AddBarberForm } from "@/components/dashboard/AddBarberForm";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


export default function SettingsPage() {
  const [barbers, setBarbers] = useState<Barber[]>(dummyBarbers);
  const [isBarberFormOpen, setIsBarberFormOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);

  const handleOpenBarberForm = (barber: Barber | null = null) => {
    setEditingBarber(barber);
    setIsBarberFormOpen(true);
  };

  const handleSaveBarber = (barberData: Omit<Barber, 'id'> | Barber) => {
    if ('id' in barberData) {
      const updatedBarbers = barbers.map(b => b.id === barberData.id ? { ...b, ...barberData } : b);
      setBarbers(updatedBarbers);
       const dummyIndex = dummyBarbers.findIndex(b => b.id === barberData.id);
      if (dummyIndex !== -1) {
          dummyBarbers[dummyIndex] = { ...dummyBarbers[dummyIndex], ...barberData };
      }
    } else {
      const newBarber = { ...barberData, id: `BBR${barbers.length + 1}` };
      const updatedBarbers = [...barbers, newBarber];
      setBarbers(updatedBarbers);
      dummyBarbers.push(newBarber);
    }
    setIsBarberFormOpen(false);
    setEditingBarber(null);
  };
  
  const handleDeleteBarber = (barberId: string) => {
    const updatedBarbers = barbers.filter(b => b.id !== barberId);
    setBarbers(updatedBarbers);
    const dummyIndex = dummyBarbers.findIndex(b => b.id === barberId);
    if (dummyIndex !== -1) {
      dummyBarbers.splice(dummyIndex, 1);
    }
  };


  return (
    <>
      <PageHeader title="Ajustes" />
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="users">Usuarios y Roles</TabsTrigger>
          <TabsTrigger value="barbers">Barberos</TabsTrigger>
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
         <TabsContent value="barbers" className="mt-6">
           <div className="flex justify-end mb-4">
              <Button size="sm" className="gap-1" onClick={() => handleOpenBarberForm()}>
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Añadir Barbero
                </span>
              </Button>
            </div>
            <AddBarberForm 
              isOpen={isBarberFormOpen}
              onOpenChange={setIsBarberFormOpen}
              onSaveBarber={handleSaveBarber}
              existingBarber={editingBarber}
            />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Avatar</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {barbers.map((barber) => (
                  <TableRow key={barber.id}>
                     <TableCell>
                        <Avatar>
                            <AvatarImage src={barber.avatarUrl} alt={barber.name} />
                            <AvatarFallback>{barber.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                     </TableCell>
                    <TableCell className="font-medium">{barber.name}</TableCell>
                    <TableCell>
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleOpenBarberForm(barber)}>Editar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteBarber(barber.id)} className="text-destructive">Eliminar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
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
