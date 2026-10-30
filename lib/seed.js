// Datos iniciales de Quinzo 1. Se usan hasta que se publique el primer cambio desde el panel (/admin).
// Fuente: presentación comercial "quinzo_presentacion_final.pdf".

const IMG = '/img/q/';
const ph = (...n) => n.map((x) => `${IMG}${x}.jpg`);

// [código, piso, bloque, tipo, dormitorios, baños, m², ambientes (texto), fotos]
const U = [
  ['Local', 0, 'Bloque delantero', 'Zócalo comercial', 0, 1, 43.38, 'Local de zócalo comercial o apto profesional. Vista a la calle y vista interna a espacio común. Incluye toilette.', ['local-ext', 'local-int']],
  ['1A', 1, 'Bloque delantero', '1 dormitorio', 1, 1, 68, 'Estar comedor 310x628 cm · Cocina 300x220 cm · Dormitorio 300x334 cm · Baño 210x175 cm · Balcón/terraza 247x428 cm.', ['1A-1', '1A-2']],
  ['1B', 1, 'Bloque delantero', '2 dormitorios', 2, 1, 83.94, 'Estar comedor 317x585 cm · Cocina 234x435 cm · Dormitorio 1 329x326 cm · Dormitorio 2 323x275 cm · Baño 212x195 cm · Balcones/terrazas 323x088 / 320x130 / 149x170 cm.', ['1B-1', '1B-2']],
  ['2A', 2, 'Bloque delantero', '1 dormitorio', 1, 1, 68, 'Estar comedor 310x628 cm · Cocina 300x220 cm · Dormitorio 300x334 cm · Baño 210x175 cm · Balcón/terraza 247x428 cm.', ['2A-1', '2A-2']],
  ['2B', 2, 'Bloque delantero', '2 dormitorios', 2, 1, 83.93, 'Estar comedor 317x585 cm · Cocina 234x435 cm · Dormitorio 1 329x326 cm · Dormitorio 2 323x275 cm · Baño 212x195 cm · Balcones/terrazas 323x088 / 320x130 / 149x170 cm.', ['2B-1', 'patio']],
  ['3A', 3, 'Bloque delantero', 'Loft 1 dormitorio', 1, 1, 89.8, 'Loft en dos plantas. Estar comedor 626x395 cm · Cocina 300x242 cm · Toilette 177x100 cm · Dormitorio en suite 373x300 cm · Baño 146x300 cm · Balcones/terrazas 244x181 / 903x100 cm.', ['3A-1', '3A-2']],
  ['3B', 3, 'Bloque delantero', 'Loft 1 dormitorio', 1, 1, 63.83, 'Loft en dos plantas. Estar comedor 437x607 cm · Toilette 100x200 cm · Dormitorio en suite 340x300 cm · Baño 150x278 cm · Balcón/terraza 445x081 cm.', ['3B-1', '3B-2']],
  ['3C', 3, 'Bloque delantero', 'Loft 1 dormitorio', 1, 1, 66.98, 'Loft en dos plantas. Estar comedor 440x498 cm · Dormitorio en suite 340x300 cm · Baño 278x194 cm · Balcón/terraza 445x156 cm.', ['3C-1', '3C-2']],
  ['1C', 1, 'Bloque trasero', '1 dormitorio', 1, 1, 62.54, 'Estar comedor 328x548 cm · Cocina 230x370 cm · Dormitorio 320x300 cm · Baño 203x166 cm · Balcón/terraza 333x140 cm.', ['1C-1', '1C-2']],
  ['1D', 1, 'Bloque trasero', '2 dormitorios', 2, 1, 87.87, 'Estar comedor 317x654 cm · Cocina 234x470 cm · Dormitorio 1 320x270 cm · Dormitorio 2 329x300 cm · Baño 213x180 cm · Toilette 151x113 cm · Balcones/terrazas 346x093 / 333x140 / 149x170 cm.', ['1D-1', '1D-2']],
  ['2C', 2, 'Bloque trasero', '1 dormitorio', 1, 1, 68, 'Estar comedor 328x548 cm · Cocina 230x370 cm · Dormitorio 320x300 cm · Baño 203x166 cm · Balcón/terraza 333x140 cm.', ['2C-1', '2C-2']],
  ['2D', 2, 'Bloque trasero', '2 dormitorios', 2, 1, 83.94, 'Estar comedor 317x654 cm · Cocina 234x470 cm · Dormitorio 1 320x270 cm · Dormitorio 2 329x300 cm · Baño 213x180 cm · Toilette 151x113 cm · Balcones/terrazas 346x093 / 333x140 / 149x170 cm.', ['2D-1', '2D-2']],
  ['3D', 3, 'Bloque trasero', 'Loft 1 dormitorio', 1, 1, 94.7, 'Loft en dos plantas. Estar comedor 652x418 cm · Cocina 260x292 cm · Toilette 161x130 cm · Dormitorio en suite 395x331 cm · Baño 154x315 cm · Balcones/terrazas 897x110 / 118x136 cm.', ['3D-1', '3D-2']],
  ['3E', 3, 'Bloque trasero', 'Loft 1 dormitorio', 1, 1, 69.5, 'Loft en dos plantas. Estar comedor 437x549 cm · Cocina 329x202 cm · Toilette 127x130 cm · Dormitorio en suite 346x344 cm · Baño 225x220 cm · Balcón/terraza 444x087 cm.', ['3E-1', '3E-2']],
  ['3F', 3, 'Bloque trasero', 'Loft 1 dormitorio', 1, 1, 66.44, 'Loft en dos plantas. Estar comedor 350x490 cm · Cocina 167x344 cm · Toilette 132x180 cm · Dormitorio en suite 435x406 cm · Baño 288x157 cm · Balcón/terraza 460x087 cm.', ['3F-1', '3F-2']]
];

function units() {
  return U.map(([code, floor, block, type, bedrooms, bathrooms, area, description, photos]) => ({
    id: 'q1-' + code,
    code,
    floor,
    block,
    type,
    bedrooms,
    bathrooms,
    area,
    coveredArea: 0,
    balcony: 0,
    orientation: '',
    price: 0,
    currency: 'USD',
    status: 'available',
    description,
    photos: ph(...photos),
    plan: `${IMG}plano-${code === 'Local' ? 'PB' : code}.png`
  }));
}

function seed() {
  return {
    company: {
      name: 'Quinzo',
      tagline: 'Viví la mejor vista de Luján',
      heroTitle: 'Viví la mejor vista de Luján, viví Quinzo.',
      heroText:
        'Quinzo 1: 14 departamentos y un local comercial en pleno casco urbano de Luján, con espacios al aire libre, materiales de primera línea y terminaciones de altos estándares.',
      about:
        'Quinzo desarrolla proyectos donde los espacios al aire libre, los semicubiertos y los cubiertos se conjugan para armar el hogar de cada persona.\n\nTodos los procesos constructivos aplicados en la materialidad de Quinzo 1 están regidos por las reglas del buen arte y auditados por CUBI. Trabajamos con materiales de primera línea para lograr terminaciones de los más altos estándares.',
      address: 'Mariano Moreno 872',
      office: 'Lavalle 316, Luján',
      city: 'Luján, Buenos Aires',
      locationTitle: 'En el corazón de Luján',
      lat: -34.5646707,
      lng: -59.1127801,
      phone: '+54 9 11 4998-9519',
      whatsapp: '5491149989519',
      email: '',
      hours: '',
      instagram: '',
      heroImage: IMG + 'hero.jpg',
      showPrices: false,
      stats: [
        { value: '14', label: 'departamentos' },
        { value: '1', label: 'local comercial' },
        { value: '1.500 m²', label: 'de proyecto' }
      ]
    },
    theme: {
      primary: '#7a6a5b',
      dark: '#2b2724',
      accent: '#b9a590',
      available: '#4f7d57',
      reserved: '#d0a04a',
      sold: '#cfc6ba'
    },
    towers: [
      {
        id: 'quinzo-1',
        name: 'Quinzo 1',
        shape: 'slab',
        address: 'Mariano Moreno 872',
        description:
          'Dos bloques —delantero con frente urbano y trasero hacia el pulmón de manzana— unidos por un microclima de espacios comunes donde la naturaleza y la arquitectura proponen una convivencia cálida. Planta baja con local comercial, hall y cocheras; tres pisos de departamentos y lofts.',
        floors: 3,
        progress: 0,
        delivery: 'A confirmar',
        tag: '',
        locationText: 'Quinzo 1 está a pasos de la plaza y la Municipalidad, y a minutos de la Basílica. Las distancias son aproximadas, desde la puerta del edificio.',
        lat: -34.5646707,
        lng: -59.1127801,
        image: IMG + 'front.jpg',
        gallery: ph('front', 'back', 'hall', 'patio', 'balcones', 'street', 'facades', 'sunset'),
        highlights: [
          { title: '14 departamentos', text: '14 unidades con características únicas. Un mismo lugar, para distintos estilos de vida. Espacios diseñados y pensados para el gusto de cada cliente. Ambientes amplios y espacios compartidos que dan calidez al día a día.' },
          { title: '1.500 m²', text: 'Los espacios al aire libre, los semicubiertos y los cubiertos se conjugan para armar el hogar de cada persona. Espacios públicos de carácter único que conviven y enaltecen la vivencia del edificio.' },
          { title: '1 local comercial', text: 'Local de zócalo comercial, que le va a dar carácter urbano. Una vista con paisaje propio que mejora la experiencia de cada visitante.' },
          { title: 'Estaciones de movilidad', text: 'Estacionamientos para autos y espacio para movilidades contemporáneas tales como moto, monopatín, bicicleta, entre otros.' }
        ],
        blocks: [
          { name: 'Bloque delantero', text: 'Frente con vista a la calle, hacia el casco urbano. Contrafrente interno con vista a la unidad trasera. Propone un microclima de espacios comunes donde la naturaleza y la arquitectura proponen una convivencia cálida.', levels: 'PB: 1 local comercial · 1°: 2 departamentos · 2°: 2 departamentos · 3°: 3 lofts', image: IMG + 'front.jpg' },
          { name: 'Bloque trasero', text: 'Frente con vista a la unidad delantera. Propone una vista familiar interna donde se evidencia la amalgama entre naturaleza, arquitectura y convivencia. Su contrafrente propone una vista hacia el pulmón de manzana, donde se descubre el corazón del barrio.', levels: 'PB: hall y estacionamientos · 1°: 2 departamentos · 2°: 2 departamentos · 3°: 3 lofts', image: IMG + 'back.jpg' }
        ],
        finishUnits: [
          { title: 'Materiales', text: 'Todas las unidades están construidas con materiales de primera categoría, certificados bajo los más altos estándares de fabricación.' },
          { title: 'Baños y cocinas', text: 'Se terminarán con revestimientos de primera categoría. Artefactos de baño FERRUM o ROCA y grifería FV con accesorios de la misma marca.' },
          { title: 'Terrazas y balcones', text: 'Se entregan con pisos alisados de hormigón.' },
          { title: 'Revoques y cielorrasos', text: 'Los revoques de paredes y cielorrasos son de yeso, con cielorrasos terminados en blanco.' },
          { title: 'Aberturas', text: 'Grandes superficies de ventanas, todas con DVH de alta prestación. Puertas principales de madera tipo tablero con cerraduras de seguridad.' },
          { title: 'Placares', text: 'Frentes integrales corredizos de melaninas texturadas de piso a techo, con interiores completos.' },
          { title: 'Calefacción', text: 'Piso radiante comandado por un termostato general. Caldera mural dual de primera línea que además provee el agua caliente de uso diario.' },
          { title: 'Aire acondicionado', text: 'Todos los ambientes (salvo baños y cocina) se entregan con la preinstalación de aire acondicionado.' },
          { title: 'Instalaciones sanitarias', text: 'Se realizan con materiales de primeras marcas del mercado.' },
          { title: 'Amoblamientos de cocina', text: 'De diseño, con mesadas de granito natural, bajo mesadas y alacenas de melamina con cajones metabox y herrajes de primera categoría. Bachas dobles de acero inoxidable y grifería monocomando FV. Se entregan con horno de acero inoxidable y campana de extracción.' },
          { title: 'Lavarropas e instalaciones', text: 'Todas las unidades se entregan con espacio para lavarropas con su instalación completa, y con cañería vacía para alarma y para TV digital-internet independiente.' }
        ],
        finishComplex: [
          'Espacios para autos',
          'Espacios para motos y bicicletas',
          'Portón de acceso vehicular automatizado',
          'Portero visor y acceso mediante tarjetas magnéticas en planta baja en cada módulo',
          'Ascensores de primera categoría electromecánicos',
          'Superficies verdes en canteros y muros verdes verticales',
          'Iluminación de espacios comunes internos y exteriores automatizada'
        ],
        floorPlans: [
          { label: 'Piso 1 · bloque delantero', src: IMG + 'planta-p1.png' },
          { label: 'Piso 2 · bloque delantero', src: IMG + 'planta-p2.png' },
          { label: 'Piso 3 · bloque delantero (planta baja)', src: IMG + 'planta-p3a.png' },
          { label: 'Piso 3 · bloque delantero (planta alta)', src: IMG + 'planta-p3b.png' },
          { label: 'Piso 1 · bloque trasero', src: IMG + 'planta-t1.png' },
          { label: 'Piso 2 · bloque trasero', src: IMG + 'planta-t2.png' },
          { label: 'Piso 3 · bloque trasero (planta baja)', src: IMG + 'planta-t3a.png' },
          { label: 'Piso 3 · bloque trasero (planta alta)', src: IMG + 'planta-t3b.png' }
        ],
        units: units()
      }
    ],
    nearby: [
      { towerId: 'quinzo-1', id: 'np1', name: 'Municipalidad de Luján', category: 'Servicios', distance: '240 m', time: '3 min', mode: 'walk' },
      { towerId: 'quinzo-1', id: 'np2', name: 'Plaza Colón', category: 'Espacios verdes', distance: '350 m', time: '4 min', mode: 'walk' },
      { towerId: 'quinzo-1', id: 'np3', name: 'Luján Tennis Club', category: 'Deportes', distance: '500 m', time: '6 min', mode: 'walk' },
      { towerId: 'quinzo-1', id: 'np4', name: 'Luján Rugby Club', category: 'Deportes', distance: '770 m', time: '10 min', mode: 'walk' },
      { towerId: 'quinzo-1', id: 'np5', name: 'Parque San Martín', category: 'Espacios verdes', distance: '800 m', time: '10 min', mode: 'walk' },
      { towerId: 'quinzo-1', id: 'np6', name: 'Clínica Güemes', category: 'Salud', distance: '830 m', time: '10 min', mode: 'walk' },
      { towerId: 'quinzo-1', id: 'np7', name: 'Basílica de Luján', category: 'Turismo', distance: '1,05 km', time: '13 min', mode: 'walk' },
      { towerId: 'quinzo-1', id: 'np8', name: 'Terminal de ómnibus', category: 'Transporte', distance: '1,1 km', time: '13 min', mode: 'walk' },
      { towerId: 'quinzo-1', id: 'np9', name: 'Complejo Museográfico Udaondo', category: 'Cultura', distance: '1,1 km', time: '14 min', mode: 'walk' },
      { towerId: 'quinzo-1', id: 'np10', name: 'Carrefour Hipermercado', category: 'Compras', distance: '1,1 km', time: '14 min', mode: 'walk' },
      { towerId: 'quinzo-1', id: 'np11', name: 'Hospital Nuestra Señora de Luján', category: 'Salud', distance: '2 km', time: '5 min', mode: 'car' },
      { towerId: 'quinzo-1', id: 'np12', name: 'Estación de tren Luján', category: 'Transporte', distance: '2,1 km', time: '5 min', mode: 'car' }
    ],
    loteos: [
      {
        id: 'la-esperada',
        name: 'La Esperada',
        subtitle: 'Barrio boutique · ex Arroyo Dulce 2',
        location: 'Luján, Buenos Aires',
        description:
          'Estamos armando el loteo La Esperada, un barrio boutique en el que fue Arroyo Dulce 2. Muy pronto vas a poder ver acá los lotes disponibles, sus medidas y ubicación dentro del barrio.',
        status: 'soon',
        image: '',
        delivery: '',
        lots: []
      }
    ],
    notices: [],
    updatedAt: 0
  };
}

module.exports = { seed };
