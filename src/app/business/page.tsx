import { LaunchDashboard } from "@/components/navigation/launch-dashboard";

export default function BusinessHome() {
 return <LaunchDashboard title="Administración de barbería"
  subtitle="Centro de operaciones conectadas al backend. Ninguna cifra de demostración se representa como resultado comercial real."
  links={[
   {href:"/business/customers",title:"Clientes y QR",detail:"Contactos registrados exclusivamente en este negocio."},
   {href:"/business/barberos",title:"Equipo",detail:"Alta, suspensión y gestión de acceso del personal."},
   {href:"/business/products",title:"Catálogo de productos",detail:"Productos y variantes almacenados en PostgreSQL."},
   {href:"/business/inventory",title:"Inventario",detail:"Movimientos y posiciones reales."},
   {href:"/business/payments",title:"Pagos",detail:"Consulta de registros de pago del servidor; proveedor externo pendiente de certificación."},
   {href:"/business/billing",title:"Plan de suscripción",detail:"Consulta de plan y facturación del workspace."},
   {href:"/business/services",title:"Servicios",detail:"Servicios operativos del negocio."},
   {href:"/business/notifications",title:"Notificaciones",detail:"Bandeja conectada al servidor."},
   {href:"/business/affiliations",title:"Afiliaciones",detail:"Asociaciones autorizadas de profesionales."},
  ]}/>;
}
