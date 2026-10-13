export type Appointment = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  service: string;
  date: string;
  status: "Pendiente" | "Confirmada" | "Cancelada" | "Completada" | "Pagada" | "En Proceso";
  barberId: string;
  barberName?: string;
  price?: number;
  duration?: number;
  paymentMethod?: "Efectivo" | "Nequi" | "Daviplata" | "Tarjeta";
  tip?: number;
  notes?: string;
};

export type Service = {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
  imageUrl?: string;
};

export type Product = {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  stock: number;
  stockMin: number;
  category?: string;
  description?: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalAppointments: number;
  totalSpent: number;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Empleado";
  lastLogin: string;
};

export type Transaction = {
  id: string;
  date: string;
  description: string;
  type: "Ingreso" | "Gasto";
  amount: number;
  barberId?: string;
  barberName?: string;
  category?: string;
  paymentMethod?: "Efectivo" | "Nequi" | "Daviplata" | "Tarjeta";
  commission?: number;
};

export type SavedObject = {
  id: string;
  customerName: string;
  objectName: string;
  dateStored: string;
  dateReturned: string | null;
  status: "Guardado" | "Devuelto";
};

export type WaitingRoomProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  imageUrl: string;
  stock: number;
  stockMin: number;
};

export type Testimonial = {
  id: string;
  customerName: string;
  comment: string;
  avatarUrl: string;
};

export type WaitingRoomOrder = {
    id: string;
    customerName: string;
    items?: { name: string; quantity: number }[];
    total: number;
    code: string;
    status: 'Pendiente' | 'Confirmado' | 'Entregado' | 'Cancelado';
    paymentMethod: 'Nequi' | 'Daviplata' | 'Efectivo' | 'Tarjeta' | null;
};

export type PortfolioItem = {
    id: string;
    imageUrl: string;
    description: string;
    category: string;
};

export type Barber = {
    id: string;
    name: string;
    avatarUrl: string;
    specialty?: string;
    phone?: string;
    email?: string;
    commissionRate?: number; // e.g. 50, 60%
    status?: 'active' | 'inactive' | 'break';
    schedule?: string;
    bio?: string;
    rating?: number;
    completedCuts?: number;
    password?: string;
};
    

  
