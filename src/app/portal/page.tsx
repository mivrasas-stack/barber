import { LaunchDashboard } from "@/components/navigation/launch-dashboard";

export default function PortalHome() {
 return <LaunchDashboard
   title="Bienvenido a Barber Paradise"
   subtitle="Selecciona un espacio para continuar. El portal de clientes, reservas y recompensas todavía está en certificación; estas operaciones no están disponibles en la versión de lanzamiento controlado."
   links={[
     {href:"/barber",title:"Espacio profesional",detail:"Solo para usuarios con acceso profesional vigente."},
     {href:"/business",title:"Administrar barbería",detail:"Solo para propietarios y gerentes autorizados."},
     {href:"/professional",title:"Workspace independiente",detail:"Solo para profesionales con membresía válida."},
   ]}
 />;
}
