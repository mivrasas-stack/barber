import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rutas protegidas que requieren autenticación
const protectedRoutes = ['/portal', '/clientes', '/barber'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Verificar si la ruta actual es una ruta protegida
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  
  if (isProtectedRoute) {
    // Verificar si existe la cookie de sesión
    const session = request.cookies.get('barberia_session');
    
    // Si no hay sesión, redirigir al login
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }
  
  return NextResponse.next();
}

// Configurar en qué rutas se ejecutará el middleware
export const config = {
  matcher: [
    '/portal/:path*',
    '/clientes/:path*',
    '/barber/:path*',
  ],
};
