# ADR-012: Solo Professional Workspaces y Modelo Multi-Tenant

## Context
En barberías y salones de belleza tradicionales, los barberos son modelados frecuentemente como simples empleados subordinados a una empresa (`role = 'EMPLOYEE'`). Sin embargo, en el mercado real de barbería, un porcentaje sustancial de los profesionales son trabajadores independientes que poseen su propia marca, definen sus propios precios, construyen su propia cartera de clientes y pueden mudarse de sede o trabajar en varios lugares sin perder su negocio.

Modelar al profesional independiente como un rol secundario dentro de la barbería anfitriona viola el principio de soberanía del usuario y compromete la propiedad de los datos del cliente.

## Decision
Crear una distinción formal a nivel de base de datos entre dos tipos de organizaciones multi-tenant mediante la columna `tenants.tenant_type`:
1. `BUSINESS`: Barbería tradicional, salón o cadena multisede con personal subordinado.
2. `SOLO_PROFESSIONAL`: Espacio de trabajo comercial independiente propiedad exclusiva de un barbero profesional.

Reglas arquitectónicas:
1. Al registrarse un profesional independiente, se aprovisiona atómicamente un `Tenant` con `tenant_type = 'SOLO_PROFESSIONAL'`, un `professional_profiles`, y un vínculo `professional_workspaces`.
2. El profesional es el único `OWNER` de su Solo Workspace, con permisos administrativos completos sobre su catálogo de servicios, disponibilidad y clientes.
3. Se crea un perfil operativo `staff_profiles` dentro del Solo Workspace para permitir el agendamiento y la ejecución de servicios en el motor de Scheduling.
4. La propiedad comercial de las citas generadas por el profesional reside en su Solo Workspace (`appointment.tenant_id = professional_workspace_tenant_id`), garantizando que la cartera de clientes no se disperse ni sea capturada de manera forzosa por las sedes anfitrionas.

## Alternatives
- **Rol de usuario 'INDEPENDENT' dentro del tenant anfitrión:** Rechazado. Si el barbero cambia de barbería, pierde el acceso a sus clientes, citas históricas y configuraciones.
- **Sistema separado o microservicio para barberos independientes:** Rechazado. Genera duplicidad de código en scheduling, catálogos y persistencia.

## Consequences
- **Positivas:** Aislamiento multi-tenant nativo garantizado por claves foráneas. El profesional retiene la soberanía absoluta de sus clientes y servicios. Reutilización completa del dominio de Scheduling y RBAC sin bifurcar el código base.
- **Negativas:** Requiere resolución contextual del workspace activo al momento de autenticar y ejecutar operaciones en la API.
