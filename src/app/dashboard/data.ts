import type { Appointment, Service, Product, Customer, User, Transaction } from "@/lib/types";

export const dummyAppointments: Appointment[] = [
  { id: 'APP001', customerName: 'John Doe', customerEmail: 'john.d@example.com', service: 'Haircut + Shave', date: '2023-10-28 10:00', status: 'Confirmed' },
  { id: 'APP002', customerName: 'Peter Jones', customerEmail: 'peter.j@example.com', service: 'Beard Trim', date: '2023-10-28 11:30', status: 'Completed' },
  { id: 'APP003', customerName: 'Sam Wilson', customerEmail: 'sam.w@example.com', service: 'Haircut', date: '2023-10-29 14:00', status: 'Pending' },
  { id: 'APP004', customerName: 'Bruce Wayne', customerEmail: 'bruce.w@example.com', service: 'Shave', date: '2023-10-30 09:00', status: 'Cancelled' },
];

export const dummyServices: Service[] = [
  { id: 'SRV01', name: 'Haircut', description: 'Classic men\'s haircut and style.', price: 40, duration: 30 },
  { id: 'SRV02', name: 'Shave', description: 'Traditional hot towel shave.', price: 35, duration: 30 },
  { id: 'SRV03', name: 'Haircut + Shave', description: 'The complete grooming package.', price: 70, duration: 60 },
  { id: 'SRV04', name: 'Beard Trim', description: 'Shape and style your beard.', price: 15, duration: 15 },
];

export const dummyProducts: Product[] = [
  { id: 'PRD001', name: 'Premium Pomade', imageUrl: 'https://picsum.photos/seed/pomade/100/100', price: 25, stock: 150 },
  { id: 'PRD002', name: 'Beard Oil', imageUrl: 'https://picsum.photos/seed/beardoil/100/100', price: 30, stock: 80 },
  { id: 'PRD003', name: 'Aftershave Balm', imageUrl: 'https://picsum.photos/seed/balm/100/100', price: 22, stock: 120 },
];

export const dummyCustomers: Customer[] = [
  { id: 'CUS001', name: 'John Doe', email: 'john.d@example.com', phone: '555-0101', totalAppointments: 5, totalSpent: 350 },
  { id: 'CUS002', name: 'Peter Jones', email: 'peter.j@example.com', phone: '555-0102', totalAppointments: 12, totalSpent: 840 },
  { id: 'CUS003', name: 'Sam Wilson', email: 'sam.w@example.com', phone: '555-0103', totalAppointments: 2, totalSpent: 80 },
  { id: 'CUS004', name: 'Bruce Wayne', email: 'bruce.w@example.com', phone: '555-0104', totalAppointments: 25, totalSpent: 2500 },
];

export const dummyUsers: User[] = [
    { id: 'USR001', name: 'Nelson', email: 'nelson@nelsonbarber.com', role: 'Admin', lastLogin: '2023-10-27 10:00 AM' },
    { id: 'USR002', name: 'Jack', email: 'jack@nelsonbarber.com', role: 'Employee', lastLogin: '2023-10-27 09:30 AM' },
    { id: 'USR003', name: 'Daniel', email: 'daniel@nelsonbarber.com', role: 'Employee', lastLogin: '2023-10-26 05:00 PM' },
];

export const dummyTransactions: Transaction[] = [
    { id: 'TRN001', date: '2023-10-27', description: 'Daily Sales - Cash', type: 'Income', amount: 450 },
    { id: 'TRN002', date: '2023-10-27', description: 'Product Restock - Pomade', type: 'Expense', amount: 200 },
    { id: 'TRN003', date: '2023-10-26', description: 'Daily Sales - Card', type: 'Income', amount: 780 },
    { id: 'TRN004', date: '2023-10-26', description: 'Rent', type: 'Expense', amount: 500 },
];

export const weeklySales = [
  { day: 'Mon', sales: 400 },
  { day: 'Tue', sales: 300 },
  { day: 'Wed', sales: 500 },
  { day: 'Thu', sales: 700 },
  { day: 'Fri', sales: 600 },
  { day: 'Sat', sales: 800 },
  { day: 'Sun', sales: 200 },
];
