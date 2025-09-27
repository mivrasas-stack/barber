export type Appointment = {
  id: string;
  customerName: string;
  customerEmail: string;
  service: string;
  date: string;
  status: "Pending" | "Confirmed" | "Cancelled" | "Completed";
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
  role: "Admin" | "Employee";
  lastLogin: string;
};

export type Transaction = {
  id: string;
  date: string;
  description: string;
  type: "Income" | "Expense";
  amount: number;
};
