# Restauración de diseño original — portal /customers

Fecha: 2026-10-13

## Corrección

**La interfaz anterior ya estaba creada** en `src/app/clientes/page.tsx`. Reemplazarla por un dashboard distinto en `/customers` fue una regresión de diseño. Se ha recuperado el componente original preservando la rejilla bento, los fondos negro/dorado, las tarjetas, transiciones y el panel secundario. No se inventó otra identidad visual.

- `src/app/customers/customer-dashboard.tsx`: copia adaptada de la pantalla del cliente original (ocho tarjetas y estilos), enlaces bajo `/customers`, y conteo de reservas próximas obtenido de `/api/v1/customers/me` en vez del texto fijo «Ninguna pendiente».
- «Mi perfil»: se eliminó la cifra ficticia «12K» de puntos VIP, reemplazada por entrada al perfil real (sin afirmar beneficios inexistentes).
- `src/app/customers/customer-shell.tsx`: navegación y fondos del layout anterior, adaptados a la ruta canónica.
- `src/app/customers/layout.tsx`: conserva el control de sesión activo en PostgreSQL, con el shell original.
- `src/app/customers/appointments` y `/customers/profile`: permanecen ligados a las APIs y la base de datos reales. No se restauraron los datos simulados de citas.
- `/customers/sala-espera`, `/customers/resenas`, `/customers/products`, `/customers/services` y `/customers/favoritos`: tarjetas y navegación restauradas. Las páginas de estas funciones muestran estado «Módulo en preparación» en diseño coherente con el original, sin simular compras, opiniones ni turnos.
- Archivos originales `/clientes` mantenidos. El acceso oficial sigue siendo `/customers`, con separación de `/barber/customers` y `/business/customers`.

## Validación

- TypeScript: aprobado, exit 0.
- Pruebas específicas de cliente y gates: 10/10, exit 0.
- Regresión completa: 439/439, 60 archivos, exit 0.
- ESLint: exit 0, 0 errores, 9 advertencias previas.
- Edge real sobre `localhost:9002` con una cuenta sintética activa: dashboard negro/dorado y 8 tarjetas verificadas; enlaces a Mi Citas, Mi Perfil, Sala de espera, Reseñas, Boutique, Servicios y Favoritos; tres módulos no certificados mostraron «Módulo en preparación», y Mis Citas/Mi Perfil abrieron correctamente; exit 0.
- Compilación Docker de producción (Contabo, multi-stage, Next 15.5.27): **aprobada, exit 0**. Imagen local: `barber-paradise:customers-original-design`. Log: `production-docker-build.log` en respaldo local.

## Preservación

- Respaldos de los cinco archivos base previos al cambio: `C:\MIVRA PROYECTS\BARBERIA\_customer_visual_restoration_20261013`.
- Ninguna base de datos de negocio fue borrada o restablecida. No se ejecutó migración ni pago real.
- No se altera la rama main. La rama de trabajo `stage5-media-cdn` y sus cambios previos permanecen.

## Pendientes reales

Sala de espera en tiempo real, reseñas con publicación/moderación y boutique con compras e inventario real todavía deben conectarse y certificarse. El diseño está restituido pero no se debe confundir la presencia del módulo con su finalización.
