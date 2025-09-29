export type Appointment = {
  id: string;
  customerName: string;
  customerEmail: string;
  service: string;
  date: string;
  status: "Pendiente" | "Confirmada" | "Cancelada" | "Completada" | "Pagada";
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
