export type Appointment = {
  id: string;
  customerName: string;
  customerEmail: string;
  service: string;
  date: string;
  status: "Pendiente" | "Confirmada" | "Cancelada" | "Completada";
};

export type Service = {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
};

export type Product = {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  stock: number;
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
