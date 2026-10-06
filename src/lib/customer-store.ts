"use client";

export interface Customer {
  id: string | number;
  name: string;
  phone?: string;
  email?: string;
  lastVisit: string;
  visits: number;
  rating: number;
  avatar: string;
  isQrRegistered?: boolean;
  registeredAt?: string;
}

const STORAGE_KEY = "mivra_registered_customers";

const INITIAL_CUSTOMERS: Customer[] = [
  { id: 1, name: "Carlos Mendoza", lastVisit: "Hoy", visits: 12, rating: 5, avatar: "CM" },
  { id: 2, name: "David Torres", lastVisit: "Hace 1 semana", visits: 8, rating: 4.8, avatar: "DT" },
  { id: 3, name: "Miguel Ángel", lastVisit: "Hace 2 semanas", visits: 24, rating: 5, avatar: "MA" },
  { id: 4, name: "Alejandro Ruiz", lastVisit: "Hace 1 mes", visits: 3, rating: 4.5, avatar: "AR" },
  { id: 5, name: "Javier Blanco", lastVisit: "Hace 2 meses", visits: 15, rating: 4.9, avatar: "JB" },
  { id: 6, name: "Pedro Luis", lastVisit: "Ayer", visits: 6, rating: 4.2, avatar: "PL" },
];

export function getStoredCustomers(): Customer[] {
  if (typeof window === "undefined") return INITIAL_CUSTOMERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_CUSTOMERS;
    const custom: Customer[] = JSON.parse(raw);
    return [...custom, ...INITIAL_CUSTOMERS];
  } catch (e) {
    console.error("Error loading customers", e);
    return INITIAL_CUSTOMERS;
  }
}

export function registerCustomerViaQr(data: { name: string; phone: string; email?: string }): Customer {
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const newCustomer: Customer = {
    id: `qr-${Date.now()}`,
    name: data.name,
    phone: data.phone,
    email: data.email,
    lastVisit: "Hoy (Registro QR)",
    visits: 1,
    rating: 5.0,
    avatar: getInitials(data.name),
    isQrRegistered: true,
    registeredAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const existing: Customer[] = raw ? JSON.parse(raw) : [];
      const updated = [newCustomer, ...existing];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.error("Error saving customer", e);
    }
  }

  return newCustomer;
}
