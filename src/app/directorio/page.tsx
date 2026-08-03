"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { MapPin, Star, Navigation, Search, Map } from "lucide-react";
import { PremiumButton } from "@/components/ui/premium-button";
import { barbershops } from "@/lib/data";

// Función de Haversine para calcular distancia en km
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radio de la tierra en km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distancia en km
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export default function DirectorioPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredShops, setFilteredShops] = useState(barbershops);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  // Filtrar por texto
  useEffect(() => {
    let result = barbershops.filter(shop => 
      shop.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      shop.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shop.specialty.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (userLocation) {
      // Ordenar por distancia
      result = result.map(shop => {
        const distance = getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, shop.lat, shop.lng);
        return { ...shop, distance };
      }).sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    setFilteredShops(result);
  }, [searchTerm, userLocation]);

  const handleFindNearest = () => {
    if (!navigator.geolocation) {
      alert("Geolocalización no es soportada por tu navegador.");
      return;
    }
    
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLoadingLocation(false);
      },
      (error) => {
        alert("No se pudo obtener la ubicación. Asegúrate de dar permisos.");
        setLoadingLocation(false);
      }
    );
  };

  return (
    <div className="min-h-screen bg-background pt-32 pb-24 relative overflow-hidden">
      {/* Background Texture */}
      <div className="absolute inset-0 opacity-10 dark:opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/5 blur-[120px] rounded-[100%] pointer-events-none" />

      <div className="container mx-auto px-6 md:px-12 relative z-10">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-headline font-bold text-foreground uppercase tracking-widest mb-4">Directorio de Barberías</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">Encuentra los mejores estilos y profesionales cerca de ti.</p>
        </div>

        {/* Buscador y Filtros */}
        <div className="flex flex-col md:flex-row gap-4 mb-16 justify-center items-center max-w-4xl mx-auto">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar por nombre, ubicación o especialidad..." 
              className="w-full bg-card border border-border rounded-full pl-12 pr-6 py-4 text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <PremiumButton 
            className="w-full md:w-auto shrink-0 flex items-center justify-center gap-2"
            onClick={handleFindNearest}
            disabled={loadingLocation}
          >
            {loadingLocation ? (
              <span className="animate-pulse">Buscando...</span>
            ) : (
              <>
                <Map className="w-5 h-5" /> 
                {userLocation ? "Ubicación Actualizada" : "Las Más Cercanas"}
              </>
            )}
          </PremiumButton>
        </div>

        {/* Listado de Barberías */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredShops.map((shop, index) => (
            <motion.div
              key={shop.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="group relative bg-card border border-border hover:border-primary/40 rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-[0_0_40px_rgba(200,155,60,0.15)] flex flex-col shadow-sm"
            >
              <div className="relative w-full h-64 overflow-hidden">
                <Image
                  src={shop.imageUrl}
                  alt={shop.name}
                  fill
                  className="object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                
                {/* Distance Badge if available */}
                {shop.distance !== undefined && (
                  <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold tracking-wider">
                    {shop.distance.toFixed(1)} km
                  </div>
                )}
              </div>
              
              <div className="p-8 flex flex-col flex-grow relative z-10 -mt-16 pointer-events-none">
                <div className="flex items-center gap-1 mb-2 bg-black/70 backdrop-blur-md border border-white/20 w-max px-3 py-1 rounded-full pointer-events-auto">
                  <Star className="w-4 h-4 text-primary fill-primary" />
                  <span className="text-white font-medium text-sm">{shop.rating}</span>
                  <span className="text-white/60 text-xs ml-1">({shop.reviews})</span>
                </div>
                
                <h3 className="text-2xl font-headline text-foreground mb-1 tracking-wide uppercase mt-4">{shop.name}</h3>
                <p className="text-primary text-sm font-medium tracking-widest uppercase mb-4">{shop.specialty}</p>
                
                <div className="flex items-center gap-2 text-muted-foreground font-light text-sm mb-8 mt-auto pointer-events-auto">
                  <MapPin className="w-4 h-4 shrink-0" />
                  {shop.location}
                </div>

                <div className="pt-6 border-t border-border flex items-center justify-between pointer-events-auto">
                   <PremiumButton 
                      variant="outline" 
                      className="w-full flex items-center justify-center gap-2"
                      onClick={() => alert("Próximamente: Vista de detalle")}
                   >
                       <Navigation className="w-4 h-4" /> Ver Detalles
                   </PremiumButton>
                </div>
              </div>
            </motion.div>
          ))}
          
          {filteredShops.length === 0 && (
            <div className="col-span-full text-center py-24 text-muted-foreground">
              <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-xl font-light">No encontramos barberías con ese criterio de búsqueda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
