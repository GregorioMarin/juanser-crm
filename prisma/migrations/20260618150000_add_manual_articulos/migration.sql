CREATE TYPE "ManualNivel" AS ENUM ('BASICO', 'AVANZADO', 'TALLER');

CREATE TABLE "ManualArticulo" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "etiquetas" TEXT,
    "nivel" "ManualNivel" NOT NULL DEFAULT 'BASICO',
    "resumen" TEXT,
    "contenido" TEXT NOT NULL,
    "usoComercial" TEXT,
    "notaInterna" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManualArticulo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ManualArticulo_slug_key"
ON "ManualArticulo"("slug");

CREATE INDEX "ManualArticulo_categoria_idx"
ON "ManualArticulo"("categoria");

CREATE INDEX "ManualArticulo_nivel_idx"
ON "ManualArticulo"("nivel");

CREATE INDEX "ManualArticulo_activo_idx"
ON "ManualArticulo"("activo");

CREATE INDEX "ManualArticulo_orden_idx"
ON "ManualArticulo"("orden");

CREATE INDEX "ManualArticulo_slug_idx"
ON "ManualArticulo"("slug");

INSERT INTO "ManualArticulo"
  ("titulo", "slug", "categoria", "etiquetas", "nivel", "resumen", "contenido", "usoComercial", "notaInterna", "orden", "activo")
VALUES
  (
    'Armarios a medida: grosores habituales',
    'armarios-a-medida-grosores-habituales',
    'Armarios a medida',
    'armarios,tablero,grosor,materiales',
    'BASICO',
    'Criterios iniciales para escoger grosores habituales en cascos, puertas y piezas interiores.',
    'Los grosores habituales en armarios a medida suelen moverse entre 16, 19, 22 y 30 mm segun uso, acabado y exigencia. Como criterio base, 19 mm funciona bien para la mayoria de estructuras interiores. Los grosores superiores se reservan para puertas grandes, piezas vistas, soluciones especiales o cuando se busca una presencia mas robusta.',
    'Explicar al cliente que el grosor no solo afecta al precio, tambien a estabilidad, tacto y durabilidad percibida.',
    'Revisar siempre altura, ancho de puerta y tipo de herraje antes de confirmar espesores.',
    10,
    true
  ),
  (
    'Armarios a medida: tipos de puertas',
    'armarios-a-medida-tipos-de-puertas',
    'Armarios a medida',
    'armarios,puertas,abatibles,correderas',
    'BASICO',
    'Diferencias basicas entre puertas abatibles, correderas y armarios sin puertas.',
    'Las puertas abatibles son sencillas, accesibles y permiten ver mejor el interior, pero necesitan espacio frontal. Las correderas son utiles cuando falta paso, aunque requieren herrajes especificos y una definicion mas precisa del sistema. Los armarios sin puertas pueden ser utiles en vestidores o zonas tecnicas.',
    'Preguntar siempre por espacio libre delante del armario y uso diario antes de recomendar sistema.',
    'Las correderas deben presupuestarse con herraje definido; no asumir coste generico si el sistema no esta claro.',
    20,
    true
  ),
  (
    'Armarios a medida: traseras y fondos',
    'armarios-a-medida-traseras-y-fondos',
    'Armarios a medida',
    'armarios,trasera,fondo,pared',
    'BASICO',
    'Criterios para decidir si conviene trasera y que grosor usar.',
    'La trasera ayuda a cerrar el mueble, mejorar rigidez y proteger el interior. En algunos casos se puede dejar sin trasera si la pared esta bien y el objetivo es ventilar o ajustar al maximo el fondo. Las traseras finas son ligeras, mientras que 10 o 16 mm aportan mas rigidez y presencia.',
    'Valorar con el cliente si busca economia, limpieza visual interior o mayor robustez.',
    'Comprobar paredes, humedad, rodapies y descuadres antes de definir la solucion.',
    30,
    true
  ),
  (
    'Armarios a medida: cajones y guías',
    'armarios-a-medida-cajones-y-guias',
    'Armarios a medida',
    'armarios,cajones,guias,herrajes',
    'AVANZADO',
    'Impacto tecnico y economico de cajones y guias en armarios.',
    'Los cajones encarecen un armario por material, mecanizado, montaje y herrajes. La eleccion de guia condiciona suavidad, carga, regulacion y durabilidad. Un cajon aparentemente sencillo suma piezas, canto, fondo y tiempo de taller.',
    'Cuando el cliente pide muchos cajones, explicar que no es solo una division interior: cada cajon suma herraje y mano de obra.',
    'Confirmar fondo util, altura disponible y tipo de guia antes de cerrar coste.',
    40,
    true
  ),
  (
    'Armarios a medida: qué encarece un armario',
    'armarios-a-medida-que-encarece-un-armario',
    'Armarios a medida',
    'armarios,costes,precio,complejidad',
    'AVANZADO',
    'Factores que suelen elevar coste y precio recomendado.',
    'Encarecen un armario: gran tamano, muchas puertas, correderas, cajoneras, acabados especiales, grosores superiores, interiores muy divididos, luces, herrajes premium, paredes descuadradas, transporte complejo y montaje largo.',
    'Ayuda a justificar diferencias de precio comparando complejidad, no solo metros cuadrados.',
    'Registrar en observaciones cualquier condicion de obra que pueda afectar fabricacion o montaje.',
    50,
    true
  ),
  (
    'Puertas de paso: calidades habituales',
    'puertas-de-paso-calidades-habituales',
    'Puertas de paso',
    'puertas,calidades,acabados',
    'BASICO',
    'Resumen de calidades habituales en puertas de paso interiores.',
    'Las puertas de paso pueden variar por alma, acabado, lacado, rechapado, herraje, tapetas y sistema de instalacion. La calidad se percibe tanto en el acabado como en peso, ajuste y durabilidad del conjunto.',
    'Preguntar si se busca renovar visualmente, mejorar calidad o resolver un problema tecnico concreto.',
    'Medir huecos y revisar premarcos antes de cerrar soluciones.',
    60,
    true
  ),
  (
    'Materiales: MDF, melamina y rechapado',
    'materiales-mdf-melamina-y-rechapado',
    'Materiales',
    'mdf,melamina,rechapado,tableros',
    'BASICO',
    'Diferencias comerciales y tecnicas entre materiales habituales.',
    'MDF es una buena base para lacado y mecanizados. Melamina ofrece resistencia practica y acabado industrial con buena relacion coste-uso. Rechapado aporta chapa natural y presencia mas noble, pero exige mas cuidado en seleccion, acabado y proceso.',
    'Traducir el material a beneficios: limpieza, acabado, resistencia, aspecto o personalizacion.',
    'Confirmar disponibilidad real de tablero y canto antes de comprometer acabados concretos.',
    70,
    true
  ),
  (
    'Herrajes: bisagras, guías y barras',
    'herrajes-bisagras-guias-y-barras',
    'Herrajes',
    'herrajes,bisagras,guias,barras',
    'TALLER',
    'Criterios basicos para herrajes habituales en armarios y muebles.',
    'Bisagras, guias y barras condicionan uso diario y durabilidad. La cantidad de bisagras depende de altura, peso y puerta. Las guias deben escogerse segun carga, recorrido y calidad esperada. Las barras requieren soportes correctos y reparto adecuado del peso.',
    'Explicar que un buen herraje se nota cada dia y reduce problemas posteriores.',
    'No cambiar gama de herraje sin ajustar coste y revisar compatibilidades de mecanizado.',
    80,
    true
  );
