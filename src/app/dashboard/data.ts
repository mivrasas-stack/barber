import type { Appointment, Service, Product, Customer, User, Transaction } from "@/lib/types";

export const dummyAppointments: Appointment[] = [
  { id: 'APP001', customerName: 'John Doe', customerEmail: 'john.d@example.com', service: 'Corte de pelo + Afeitado', date: '2023-10-28 10:00', status: 'Confirmada' },
  { id: 'APP002', customerName: 'Peter Jones', customerEmail: 'peter.j@example.com', service: 'Corte de barba', date: '2023-10-28 11:30', status: 'Completada' },
  { id: 'APP003', customerName: 'Sam Wilson', customerEmail: 'sam.w@example.com', service: 'Corte de pelo', date: '2023-10-29 14:00', status: 'Pendiente' },
  { id: 'APP004', customerName: 'Bruce Wayne', customerEmail: 'bruce.w@example.com', service: 'Afeitado', date: '2023-10-30 09:00', status: 'Cancelada' },
];

export const dummyServices: Service[] = [
  { id: 'SRV01', name: 'Corte de pelo', description: 'Corte de pelo y peinado clásico para hombres.', price: 40000, duration: 30 },
  { id: 'SRV02', name: 'Afeitado', description: 'Afeitado tradicional con toalla caliente.', price: 35000, duration: 30 },
  { id: 'SRV03', name: 'Corte de pelo + Afeitado', description: 'El paquete completo de aseo.', price: 70000, duration: 60 },
  { id: 'SRV04', name: 'Corte de barba', description: 'Dale forma y estilo a tu barba.', price: 15000, duration: 15 },
];

export const dummyProducts: Product[] = [
  { id: 'PRD001', name: 'Pomada Premium', imageUrl: 'https://picsum.photos/seed/pomade/100/100', price: 25000, stock: 150 },
  { id: 'PRD002', name: 'Aceite para Barba', imageUrl: 'https://picsum.photos/seed/beardoil/100/100', price: 30000, stock: 80 },
  { id: 'PRD003', name: 'Bálsamo para Después de Afeitar', imageUrl: 'https://picsum.photos/seed/balm/100/100', price: 22000, stock: 120 },
];

export const dummyCustomers: Customer[] = [
  { id: 'CUS001', name: 'John Doe', email: 'john.d@example.com', phone: '555-0101', totalAppointments: 5, totalSpent: 350000 },
  { id: 'CUS002', name: 'Peter Jones', email: 'peter.j@example.com', phone: '555-0102', totalAppointments: 12, totalSpent: 840000 },
  { id: 'CUS003', name: 'Sam Wilson', email: 'sam.w@example.com', phone: '555-0103', totalAppointments: 2, totalSpent: 80000 },
  { id: 'CUS004', name: 'Bruce Wayne', email: 'bruce.w@example.com', phone: '555-0104', totalAppointments: 25, totalSpent: 2500000 },
];

export const dummyUsers: User[] = [
    { id: 'USR001', name: 'Nelson', email: 'nelson@barberparadise.com', role: 'Admin', lastLogin: '2023-10-27 10:00 AM' },
    { id: 'USR002', name: 'Jack', email: 'jack@barberparadise.com', role: 'Empleado', lastLogin: '2023-10-27 09:30 AM' },
    { id: 'USR003', name: 'Daniel', email: 'daniel@barberparadise.com', role: 'Empleado', lastLogin: '2023-10-26 05:00 PM' },
];

export const dummyTransactions: Transaction[] = [
    { id: 'TRN001', date: '2023-10-27', description: 'Ventas del día - Efectivo', type: 'Ingreso', amount: 450000 },
    { id: 'TRN002', date: '2023-10-27', description: 'Reabastecimiento de producto - Pomada', type: 'Gasto', amount: 200000 },
    { id: 'TRN003', date: '2023-10-26', description: 'Ventas del día - Tarjeta', type: 'Ingreso', amount: 780000 },
    { id: 'TRN004', date: '2023-10-26', description: 'Alquiler', type: 'Gasto', amount: 500000 },
];

export const weeklySales = [
  { day: 'Lun', sales: 400000 },
  { day: 'Mar', sales: 300000 },
  { day: 'Mié', sales: 500000 },
  { day: 'Jue', sales: 700000 },
  { day: 'Vie', sales: 600000 },
  { day: 'Sáb', sales: 800000 },
  { day: 'Dom', sales: 200000 },
];
