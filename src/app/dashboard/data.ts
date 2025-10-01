import type { Appointment, Service, Product, Customer, User, Transaction, SavedObject, WaitingRoomProduct, Testimonial, WaitingRoomOrder, PortfolioItem } from "@/lib/types";

export const dummyAppointments: Appointment[] = [
  { id: 'APP001', customerName: 'John Doe', customerEmail: 'john.d@example.com', service: 'Corte de pelo + Afeitado', date: '2023-10-28 10:00', status: 'Confirmada' },
  { id: 'APP002', customerName: 'Peter Jones', customerEmail: 'peter.j@example.com', service: 'Corte de barba', date: '2023-10-28 11:30', status: 'Completada' },
  { id: 'APP003', customerName: 'Sam Wilson', customerEmail: 'sam.w@example.com', service: 'Corte de pelo', date: '2023-10-29 14:00', status: 'Pendiente' },
  { id: 'APP004', customerName: 'Bruce Wayne', customerEmail: 'bruce.w@example.com', service: 'Afeitado', date: '2023-10-30 09:00', status: 'Cancelada' },
];

export const dummyServices: Service[] = [
  { id: 'SRV01', name: 'Corte de pelo', description: 'Corte de pelo y peinado clásico para hombres.', price: 40000, duration: 30, imageUrl: 'https://picsum.photos/seed/haircut/600/400' },
  { id: 'SRV02', name: 'Afeitado', description: 'Afeitado tradicional con toalla caliente.', price: 35000, duration: 30, imageUrl: 'https://picsum.photos/seed/shave/600/400' },
  { id: 'SRV03', name: 'Corte de pelo + Afeitado', description: 'El paquete completo de aseo.', price: 70000, duration: 60, imageUrl: 'https://picsum.photos/seed/fullservice/600/400' },
  { id: 'SRV04', name: 'Corte de barba', description: 'Dale forma y estilo a tu barba.', price: 15000, duration: 15, imageUrl: 'https://picsum.photos/seed/beardtrim/600/400' },
];

export const dummyProducts: Product[] = [
  { id: 'PRD001', name: 'Pomada Premium', imageUrl: 'https://picsum.photos/seed/pomade/100/100', price: 25000, stock: 15, stockMin: 10 },
  { id: 'PRD002', name: 'Aceite para Barba', imageUrl: 'https://picsum.photos/seed/beardoil/100/100', price: 30000, stock: 80, stockMin: 20 },
  { id: 'PRD003', name: 'Bálsamo para Después de Afeitar', imageUrl: 'https://picsum.photos/seed/balm/100/100', price: 22000, stock: 120, stockMin: 15 },
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
    { id: 'TRN003', date: '2023-10-26', description: 'Ventas del día - Tarjeta', type: 'Ingreso', amount: 780000 },
    { id: 'TRN004', date: '2023-10-26', description: 'Alquiler', type: 'Gasto', amount: 500000 },
    { id: 'TRN005', date: '2023-10-25', description: 'Pago de Servicios Públicos', type: 'Gasto', amount: 150000 },
];

export const serviceTransactions: Transaction[] = [
    { id: 'TRN_SRV_001', date: '2023-10-27', description: 'Corte de pelo + Afeitado (John Doe)', type: 'Ingreso', amount: 70000 },
    { id: 'TRN_SRV_002', date: '2023-10-27', description: 'Corte de barba (Peter Jones)', type: 'Ingreso', amount: 15000 },
    { id: 'TRN_SRV_003', date: '2023-10-26', description: 'Corte de pelo (Cliente Casual)', type: 'Ingreso', amount: 40000 },
];

export const productTransactions: Transaction[] = [
    { id: 'TRN_PROD_001', date: '2023-10-27', description: 'Venta - Pomada Premium x2', type: 'Ingreso', amount: 50000 },
    { id: 'TRN_PROD_002', date: '2023-10-27', description: 'Reabastecimiento - Aceite para Barba', type: 'Gasto', amount: 300000 },
    { id: 'TRN_PROD_003', date: '2023-10-26', description: 'Venta - Bálsamo x1, Aceite x1', type: 'Ingreso', amount: 52000 },
];

export const waitingRoomTransactions: Transaction[] = [
    { id: 'TRN_WR_001', date: '2023-10-27', description: 'Venta - Coca-Cola x2', type: 'Ingreso', amount: 6000 },
    { id: 'TRN_WR_002', date: '2023-10-27', description: 'Venta - Papas Fritas x1', type: 'Ingreso', amount: 2500 },
    { id: 'TRN_WR_003', date: '2023-10-26', description: 'Venta - Café x1, Cerveza x1', type: 'Ingreso', amount: 7500 },
];

export const dummySavedObjects: SavedObject[] = [
    { id: 'OBJ001', customerName: 'John Doe', objectName: 'Maletín negro', dateStored: '2023-10-28', dateReturned: null, status: 'Guardado' },
    { id: 'OBJ002', customerName: 'Peter Jones', objectName: 'Casco de moto', dateStored: '2023-10-28', dateReturned: '2023-10-28', status: 'Devuelto' },
    { id: 'OBJ003', customerName: 'Sam Wilson', objectName: 'Paraguas', dateStored: '2023-10-29', dateReturned: null, status: 'Guardado' },
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

export const dummyWaitingRoomProducts: WaitingRoomProduct[] = [
  { id: 'WR001', name: 'Coca-Cola', category: 'Gaseosas', price: 3000, imageUrl: 'https://picsum.photos/seed/cocacola/300/300', stock: 50, stockMin: 10 },
  { id: 'WR002', name: 'Papas Fritas', category: 'Golosinas', price: 2500, imageUrl: 'https://picsum.photos/seed/chips/300/300', stock: 30, stockMin: 5 },
  { id: 'WR003', name: 'Agua', category: 'Bebidas', price: 2000, imageUrl: 'https://picsum.photos/seed/water/300/300', stock: 100, stockMin: 20 },
  { id: 'WR004', name: 'Café', category: 'Bebidas', price: 2500, imageUrl: 'https://picsum.photos/seed/coffee/300/300', stock: 40, stockMin: 10 },
  { id: 'WR005', name: 'Galletas', category: 'Golosinas', price: 1500, imageUrl: 'https://picsum.photos/seed/cookies/300/300', stock: 60, stockMin: 15 },
  { id: 'WR006', name: 'Jugo de Naranja', category: 'Bebidas', price: 3000, imageUrl: 'https://picsum.photos/seed/orangejuice/300/300', stock: 25, stockMin: 5 },
  { id: 'WR007', name: 'Maní', category: 'Golosinas', price: 2000, imageUrl: 'https://picsum.photos/seed/peanuts/300/300', stock: 80, stockMin: 10 },
  { id: 'WR008', name: 'Cerveza', category: 'Bebidas', price: 5000, imageUrl: 'https://picsum.photos/seed/beer/300/300', stock: 15, stockMin: 5 },
];

export const dummyTestimonials: Testimonial[] = [
    {
        id: 'TST001',
        customerName: 'Thomas Jackson',
        comment: 'Tus trabajos son realmente buenos. Confío en tus habilidades y espero que el próximo proyecto sea aún mejor que el anterior.',
        avatarUrl: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw4fHxtYW4lMjBwb3J0cmFpdHxlbnwwfHx8fDE3NTg5NTE1NDl8MA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
        id: 'TST002',
        customerName: 'Alex Thompson',
        comment: 'La mejor barbería de la ciudad. El ambiente es genial y los barberos son auténticos profesionales. ¡Volveré pronto!',
        avatarUrl: 'https://picsum.photos/seed/alex/100/100',
    },
    {
        id: 'TST003',
        customerName: 'Marcus Holloway',
        comment: 'Llevo años viniendo aquí y nunca me ha decepcionado. El servicio es siempre de primera y el resultado impecable.',
        avatarUrl: 'https://picsum.photos/seed/marcus/100/100',
    }
];


export const dummyWaitingRoomOrders: WaitingRoomOrder[] = [
    { id: 'ORD001', customerName: 'John Doe', code: '123456', total: 5500, status: 'Pendiente', paymentMethod: 'Efectivo', items: [{ name: 'Coca-Cola', quantity: 1 }, { name: 'Papas Fritas', quantity: 1 }] },
    { id: 'ORD002', customerName: 'Peter Jones', code: '654321', total: 2000, status: 'Confirmado', paymentMethod: 'Nequi', items: [{ name: 'Agua', quantity: 1 }] },
    { id: 'ORD003', customerName: 'Sam Wilson', code: '987654', total: 7500, status: 'Pendiente', paymentMethod: 'Daviplata', items: [{ name: 'Cerveza', quantity: 1 }, { name: 'Café', quantity: 1 }] },
];

export const dummyPortfolioItems: PortfolioItem[] = [
    {
        id: 'PORT001',
        imageUrl: 'https://images.unsplash.com/photo-1621607512022-6aecc4fed814?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw5fHxiYXJiZXIlMjBiZWFyZHxlbnwwfHx8fDE3NTg5MDcxMTJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
        description: 'Close-up of a barber meticulously trimming a client\'s beard.',
        category: 'Beard',
    },
    {
        id: 'PORT002',
        imageUrl: 'https://images.unsplash.com/photo-1590509294910-32752e061399?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxiYXJiZXIlMjBzdHlsaW5nfGVufDB8fHx8MTc1ODk4ODM0N3ww&ixlib=rb-4.1.0&q=80&w=1080',
        description: 'A barber styling a client\'s hair after a fresh cut.',
        category: 'Haircut',
    }
];
    

  