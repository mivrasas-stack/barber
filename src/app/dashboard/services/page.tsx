"use client";
import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/PageHeader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { dummyServices } from "../data";
import { AddServiceForm } from '@/components/dashboard/AddServiceForm';
import type { Service } from '@/lib/types';

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>(dummyServices);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const handleOpenForm = (service: Service | null = null) => {
    setEditingService(service);
    setIsFormOpen(true);
  };

  const handleSaveService = (serviceData: Omit<Service, 'id'> | Service) => {
    if ('id' in serviceData) {
      // Editing existing service
      const updatedServices = services.map(s => s.id === serviceData.id ? { ...s, ...serviceData } : s);
      setServices(updatedServices);
      const dummyIndex = dummyServices.findIndex(s => s.id === serviceData.id);
      if (dummyIndex !== -1) {
          dummyServices[dummyIndex] = { ...dummyServices[dummyIndex], ...serviceData };
      }
    } else {
      // Adding new service
      const newService = { ...serviceData, id: `SRV${services.length + 1}` };
      const updatedServices = [...services, newService];
      setServices(updatedServices);
      dummyServices.push(newService);
    }
    setIsFormOpen(false);
    setEditingService(null);
  };

  const handleDeleteService = (serviceId: string) => {
    const updatedServices = services.filter(s => s.id !== serviceId);
    setServices(updatedServices);
    const dummyIndex = dummyServices.findIndex(s => s.id === serviceId);
    if (dummyIndex !== -1) {
      dummyServices.splice(dummyIndex, 1);
    }
  };


  return (
    <>
      <PageHeader title="Servicios">
        <Button size="sm" className="gap-1" onClick={() => handleOpenForm()}>
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Añadir Servicio
          </span>
        </Button>
      </PageHeader>
      
      <AddServiceForm 
        isOpen={isFormOpen}
        onOpenChange={(isOpen) => {
            setIsFormOpen(isOpen);
            if (!isOpen) setEditingService(null);
        }}
        onSaveService={handleSaveService}
        existingService={editingService}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead>Duración</TableHead>
            <TableHead>
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => (
            <TableRow key={service.id}>
              <TableCell className="font-medium">{service.name}</TableCell>
              <TableCell>{service.description}</TableCell>
              <TableCell>COP {service.price.toLocaleString('es-CO')}</TableCell>
              <TableCell>{service.duration} min</TableCell>
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
                    <DropdownMenuItem onClick={() => handleOpenForm(service)}>Editar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteService(service.id)}>Eliminar</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
