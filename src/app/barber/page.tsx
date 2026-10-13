import { LaunchDashboard } from "@/components/navigation/launch-dashboard";

export default function BarberHome() {
 return <LaunchDashboard title="Espacio profesional"
  subtitle="Accede a las funciones operativas conectadas al servidor. El contenido de demostración permanece disponible solo para pruebas locales."
  links={[
   {href:"/barber/pos",title:"Caja en efectivo / POS",detail:"Registro de ventas respaldado por órdenes, inventario y contabilidad."},
   {href:"/barber/customers",title:"Mis clientes y QR",detail:"Directorio persistente y QR específico de esta barbería."},
   {href:"/barber/services",title:"Servicios",detail:"Servicios administrados en el backend."},
   {href:"/barber/inventory",title:"Inventario",detail:"Existencias registradas para el negocio autorizado."},
   {href:"/barber/barberos",title:"Barberos",detail:"Gestión de personal con permisos de propietario o gerente."},
   {href:"/barber/affiliations",title:"Afiliaciones",detail:"Vínculos profesionales y negocios autorizados."},
  ]}/>;
}
