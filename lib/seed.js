// Datos de ejemplo. Se usan hasta que se publique el primer cambio desde el panel.
// Todo es ficticio: reemplazalo desde /admin.

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const TYPES = [
  { type: 'Monoambiente', bedrooms: 0, area: 38, bathrooms: 1, plan: '/img/plan-1.svg' },
  { type: '1 dormitorio', bedrooms: 1, area: 52, bathrooms: 1, plan: '/img/plan-1.svg' },
  { type: '2 dormitorios', bedrooms: 2, area: 74, bathrooms: 2, plan: '/img/plan-2.svg' },
  { type: '3 dormitorios', bedrooms: 3, area: 108, bathrooms: 2, plan: '/img/plan-3.svg' }
];
const ORIENT = ['Norte', 'Este', 'Noreste', 'Oeste', 'Noroeste', 'Sur'];
const PHOTOS = ['/img/ph-1.svg', '/img/ph-2.svg', '/img/ph-3.svg'];

function buildUnits(prefix, floors, perFloor, base, soldRatio, reservedRatio, seed) {
  const r = rng(seed);
  const units = [];
  for (let f = 1; f <= floors; f++) {
    for (let k = 0; k < perFloor; k++) {
      const letter = String.fromCharCode(65 + k);
      let t = TYPES[(k + (f > floors - 2 ? 1 : 0) + (f % 3 === 0 ? 1 : 0)) % 3];
      if (f >= floors - 1 && k === 0) t = TYPES[3];
      const roll = r();
      const status = roll < soldRatio ? 'sold' : roll < soldRatio + reservedRatio ? 'reserved' : 'available';
      const area = t.area + Math.round(r() * 4);
      units.push({
        id: `${prefix}-${f}${letter}`,
        code: `${f}${letter}`,
        floor: f,
        type: t.type,
        bedrooms: t.bedrooms,
        bathrooms: t.bathrooms,
        area,
        coveredArea: Math.round(area * 0.88),
        balcony: t.bedrooms === 0 ? 4 : 6 + Math.round(r() * 5),
        orientation: ORIENT[Math.floor(r() * ORIENT.length)],
        price: Math.round((area * (base + f * 18)) / 1000) * 1000,
        currency: 'USD',
        status,
        description:
          'Living comedor integrado, cocina con mesada de cuarzo, pisos de porcelanato y carpinterías de aluminio con DVH.',
        photos: PHOTOS.slice(0, 2 + (k % 2)),
        plan: t.plan
      });
    }
  }
  return units;
}

function seed() {
  return {
    company: {
      name: 'Norte Austral Desarrollos',
      tagline: 'Construimos en Zona Norte desde 2004',
      heroTitle: 'Tres torres en obra. Las últimas unidades, todavía disponibles.',
      heroText:
        'Seguí el avance real de cada edificio y elegí tu unidad con planos, fotos y precios actualizados.',
      about:
        'Somos una constructora familiar con más de veinte años de obra propia. Proyectamos, construimos y entregamos cada edificio con equipos estables y control de calidad en cada etapa. Trabajamos con materiales de primera línea y acompañamos a cada comprador desde la reserva hasta la escritura.',
      address: 'Av. del Libertador 4520',
      city: 'Vicente López, Buenos Aires',
      lat: -34.5287,
      lng: -58.4741,
      phone: '+54 11 5555-0142',
      whatsapp: '5491155550142',
      email: 'ventas@norteaustral.example',
      hours: 'Lunes a viernes de 9 a 18 h · Sábados de 10 a 13 h',
      instagram: '',
      stats: [
        { value: '20', label: 'años construyendo' },
        { value: '18', label: 'edificios entregados' },
        { value: '1.240', label: 'familias en sus hogares' }
      ]
    },
    theme: {
      primary: '#1f4fbf',
      dark: '#0a2540',
      accent: '#5b8def',
      available: '#1f9d6b',
      reserved: '#e0a22b',
      sold: '#b8c2d1'
    },
    towers: [
      {
        id: 'torre-alba',
        name: 'Torre Alba',
        shape: 'slab',
        address: 'Av. del Libertador 4520',
        description:
          'Frente al río, con amenities en planta baja y terraza con solárium. Obra en etapa de terminaciones.',
        floors: 12,
        progress: 94,
        delivery: 'Diciembre 2026',
        image: '',
        units: buildUnits('alba', 12, 3, 2650, 0.7, 0.1, 11)
      },
      {
        id: 'torre-meridiano',
        name: 'Torre Meridiano',
        shape: 'stepped',
        address: 'Intendente Careaga 1280',
        description:
          'Volumen escalonado con terrazas privadas en los pisos superiores. Estructura terminada, en etapa de cerramientos.',
        floors: 14,
        progress: 62,
        delivery: 'Octubre 2027',
        image: '',
        units: buildUnits('meridiano', 14, 3, 2480, 0.38, 0.1, 29)
      },
      {
        id: 'torre-faro',
        name: 'Torre Faro',
        shape: 'twin',
        address: 'Yrigoyen 3015',
        description:
          'Dos cuerpos unidos por un núcleo de servicios, con unidades de uno a tres dormitorios. Obra en estructura.',
        floors: 16,
        progress: 27,
        delivery: 'Junio 2028',
        image: '',
        units: buildUnits('faro', 16, 2, 2300, 0.18, 0.08, 43)
      }
    ],
    notices: [
      {
        id: 'n1',
        title: 'Preventa Torre Faro: últimas unidades con precio de lanzamiento',
        body:
          'Hasta fin de mes mantenemos el precio de lanzamiento en las unidades de Torre Faro. Podés reservar con una seña y congelar el valor del metro cuadrado.',
        date: '2026-10-20',
        pinned: true,
        active: true
      },
      {
        id: 'n2',
        title: 'Torre Alba: visita guiada a las unidades terminadas',
        body:
          'Todos los sábados de 10 a 13 h podés recorrer las unidades piloto con un asesor. Pedí turno por WhatsApp.',
        date: '2026-10-12',
        pinned: false,
        active: true
      },
      {
        id: 'n3',
        title: 'Avance de obra de Torre Meridiano',
        body: 'Finalizamos la estructura de hormigón y comenzamos con mampostería y cerramientos exteriores.',
        date: '2026-09-30',
        pinned: false,
        active: true
      }
    ],
    updatedAt: 0
  };
}

module.exports = { seed };
