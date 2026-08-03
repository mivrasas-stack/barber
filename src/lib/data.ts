export const barbershops = [
  {
    id: 1,
    name: "The Royal Barber",
    location: "Zona G, Bogotá",
    lat: 4.6465,
    lng: -74.0553, // Zona G aprox
    rating: 4.9,
    reviews: 1250,
    imageUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=2070&auto=format&fit=crop",
    specialty: "Cortes Clásicos & Barba",
    description: "Una experiencia de barbería tradicional que combina el lujo de antaño con técnicas modernas. Especialistas en cortes clásicos, afeitados con toalla caliente y tratamientos premium para el cuidado masculino.",
    gallery: [
      "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=500&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=500&auto=format&fit=crop"
    ],
    barbers: [
      {
        id: 1,
        name: "Carlos Torres",
        role: "Master Barber",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop",
        portfolio: [
          "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=400&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1520338661084-ce39c1048c26?q=80&w=400&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=400&auto=format&fit=crop"
        ]
      },
      {
        id: 2,
        name: "David Silva",
        role: "Colorista & Fade",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop",
        portfolio: [
          "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=400&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1593702288056-b09e6c1e57c6?q=80&w=400&auto=format&fit=crop"
        ]
      }
    ],
    customerReviews: [
      { id: 1, author: "Andrés M.", rating: 5, date: "Hace 2 días", comment: "Excelente servicio. Carlos entiende perfectamente lo que quieres y se toma su tiempo para que el corte quede impecable." },
      { id: 2, author: "Felipe R.", rating: 5, date: "Hace 1 semana", comment: "El mejor afeitado tradicional de la ciudad. El ambiente es increíble y te ofrecen una bebida de cortesía." },
      { id: 3, author: "Daniel V.", rating: 4, date: "Hace 2 semanas", comment: "Muy buena atención, pero recomiendo reservar con varios días de anticipación porque siempre están llenos." }
    ]
  },
  {
    id: 2,
    name: "Gentleman's Lounge",
    location: "El Poblado, Medellín",
    lat: 6.2084,
    lng: -75.5670, // El Poblado aprox
    rating: 4.8,
    reviews: 980,
    imageUrl: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2074&auto=format&fit=crop",
    specialty: "Experiencia VIP",
    description: "Un espacio exclusivo diseñado para el hombre moderno. Relájate, disfruta de un whiskey en nuestro lounge, y déjate atender por los mejores estilistas de la ciudad en sillas de cuero premium.",
    gallery: [
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=500&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=500&auto=format&fit=crop"
    ],
    barbers: [
      {
        id: 3,
        name: "Luis Mendoza",
        role: "Senior Stylist",
        avatar: "https://images.unsplash.com/photo-1542327897-4141b6c0e20c?q=80&w=150&auto=format&fit=crop",
        portfolio: [
          "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=400&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=400&auto=format&fit=crop"
        ]
      }
    ],
    customerReviews: [
      { id: 4, author: "Mauricio L.", rating: 5, date: "Hace 3 días", comment: "Servicio de lujo absoluto. Luis es un genio con las tijeras. Totalmente recomendado, vale cada peso." }
    ]
  },
  {
    id: 3,
    name: "Classic Cuts Club",
    location: "Bocagrande, Cartagena",
    lat: 10.4005,
    lng: -75.5539, // Bocagrande aprox
    rating: 4.9,
    reviews: 845,
    imageUrl: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=1988&auto=format&fit=crop",
    specialty: "Estilo Urbano Premium",
    description: "Donde la técnica clásica se encuentra con los estilos más modernos y urbanos. Música en vivo los fines de semana, excelente ambiente y los cortes más precisos frente al mar.",
    gallery: [
      "https://images.unsplash.com/photo-1593702288056-b09e6c1e57c6?q=80&w=500&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1520338661084-ce39c1048c26?q=80&w=500&auto=format&fit=crop"
    ],
    barbers: [
      {
        id: 4,
        name: "Diego Franco",
        role: "Barber Artist",
        avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=150&auto=format&fit=crop",
        portfolio: [
          "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=400&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=400&auto=format&fit=crop"
        ]
      }
    ],
    customerReviews: [
      { id: 5, author: "Kevin C.", rating: 4, date: "Hace 1 mes", comment: "Buenos cortes, mucha técnica. El ambiente urbano está buenísimo y los barberos son muy creativos." }
    ]
  },
  {
    id: 4,
    name: "Urban Style Barber",
    location: "Norte, Barranquilla",
    lat: 11.0022,
    lng: -74.8213,
    rating: 4.7,
    reviews: 620,
    imageUrl: "https://images.unsplash.com/photo-1508898578281-774ac4893c0c?q=80&w=1974&auto=format&fit=crop",
    specialty: "Fades & Diseños",
    description: "Expertos en fades, tapers y diseños creativos. El mejor lugar para mantener un estilo fresco y a la moda.",
    gallery: [
      "https://images.unsplash.com/photo-1593702288056-b09e6c1e57c6?q=80&w=500&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=500&auto=format&fit=crop"
    ],
    barbers: [
      {
        id: 5,
        name: "Juan Pérez",
        role: "Fade Master",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop",
        portfolio: [
          "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=400&auto=format&fit=crop"
        ]
      }
    ],
    customerReviews: [
      { id: 6, author: "Jorge P.", rating: 5, date: "Hace 2 semanas", comment: "Excelentes degradados." }
    ]
  }
];
