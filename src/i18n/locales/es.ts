/**
 * The **reference** locale — the union of every string the app can show.
 *
 * It is the source of truth for three things: what the app says, which keys
 * exist, and the shape `t()` is type-checked against (`src/i18n/types.ts`).
 * `en.ts` must have exactly the same key set and exactly the same
 * `{{placeholders}}`; both are enforced by tests, not by discipline.
 *
 * Conventions:
 * - Plurals use i18next's `_one` / `_other` suffixes and `{{count}}`, never a
 *   hand-rolled `n === 1 ? '' : 's'`. A translator then owns the whole phrase.
 * - Sentences never get concatenated — pass `{{name}}`/`{{amount}}` so English
 *   can put the pieces in its own order.
 * - `aria-label`, `title` and `alt` are copy too, and live here.
 *
 * Not here: repository error copy (`src/repositories/**`). The data layer has no
 * language dependency by design — see the known limitation in `DOCUMENTATION.md`.
 */
const es = {
  common: {
    close: 'Cerrar',
    cancel: 'Cancelar',
    retry: 'Reintentar',
    edit: 'Editar',
    remove: 'Eliminar',
    saveChanges: 'Guardar cambios',
    notAvailable: 'N/D',
    unnamedClient: 'Cliente sin nombre',
    productFallback: 'Sin producto',
    productNumber: 'Producto #{{id}}',
    /** The switch's group label; the buttons carry the two-letter codes. */
    language: 'Idioma',
    switchToEnglish: 'Cambiar a inglés',
    switchToSpanish: 'Cambiar a español',
    /** Placeholder shown where a custom-article image is expected but missing. */
    imagePlaceholder: 'Sin imagen',
  },

  /** Shared confirmation dialogs. Per-action wording is passed in by the caller. */
  confirm: {
    title: '¿Confirmar acción?',
  },

  nav: {
    skipToContent: 'Saltar al contenido',
    signOut: 'Cerrar sesión',
    dashboardTitle: 'Panel de gestión',
    dashboardSubtitle: 'Tu catálogo, las compras de tus clientes y sus pagos.',
    refresh: 'Refrescar',
    refreshAria: 'Refrescar productos y ventas',
    tabsAria: 'Secciones del panel',
    tabProducts: 'Mis productos',
    tabOrders: 'Mis pedidos',
    tabAdmin: 'Panel de administrador',
  },

  auth: {
    eyebrow: 'Y más.',
    wordmark: 'Gestión de cupos',
    title: 'Inicia sesión',
    subtitle: 'Ingresa con tu correo y contraseña para ver tu panel.',
    email: 'Correo electrónico',
    emailPlaceholder: 'nombre@ejemplo.com',
    password: 'Contraseña',
    submit: 'Iniciar sesión',
    submitting: 'Iniciando sesión…',
    verifyingSession: 'Verificando sesión…',
  },

  products: {
    sectionTitle: 'Mis productos',
    count_one: '{{count}} producto',
    count_other: '{{count}} productos',
    loading: 'Cargando productos…',
    emptyTitle: 'Todavía no hay productos',
    emptyBody:
      'Publica tu primer cupo para poder registrar las compras de tus clientes y el avance de sus pagos.',
    idBadge: 'ID: {{id}}',
    purchasesCount_one: '{{count}} compra',
    purchasesCount_other: '{{count}} compras',

    new: 'Nuevo producto',
    createTitle: 'Nuevo producto',
    editTitle: 'Editar producto',
    create: 'Crear producto',
    closeFormAria: 'Cerrar formulario',
    name: 'Nombre',
    description: 'Descripción',
    value: 'Valor',
    releaseDate: 'Fecha de lanzamiento',
    image: 'Imagen',
    imageHint: 'JPG o PNG. Al guardar se reemplaza la imagen actual.',
    removeCurrentImageAria: 'Eliminar imagen',
    discardSelectedImageAria: 'Quitar imagen',

    detailDescription: 'Descripción',
    detailRelease: 'Lanzamiento',
    detailValue: 'Valor',
    detailPurchases: 'Compras',
    openPurchases: 'Compras',

    deleteTitle: '¿Eliminar producto?',
    deleteMessage:
      'Se eliminará "{{name}}" junto con sus compras y sus pagos. No se puede deshacer.',
    deleteConfirm: 'Eliminar producto',
  },

  purchases: {
    title: 'Compras de {{product}}',
    add: 'Agregar compra',
    addTitle: 'Agregar compra',
    editTitle: 'Editar compra',
    clientName: 'Nombre del cliente',
    firstName: 'Nombre de pila',
    phone: 'Teléfono',
    socialMedia: 'Red social de contacto',
    socialMediaEmpty: 'Seleccionar…',
    socialMessenger: 'Messenger',
    socialWhatsapp: 'WhatsApp',
    socialFacebook: 'Facebook',
    socialInstagram: 'Instagram',
    socialTiktok: 'TikTok',
    agreedPrice: 'Precio acordado',
    register: 'Registrar compra',
    productLabel: 'Producto: {{name}}',
    paid: 'Pagado',
    pending: 'Pendiente',
    owner: 'Cuenta del cliente',
    noOwner: 'Sin cuenta',
    ownerAdmin: 'Admin',
    ownerCustomer: 'Cliente',
    status: 'Estado',
    statusShippingToLockerAbroad: 'Envío a casillero (exterior)',
    statusAtLockerAbroad: 'En casillero (exterior)',
    statusShippingToColombia: 'Envío a Colombia',
    statusAtColombia: 'En Colombia',
    statusShippingToClient: 'Envío al cliente',
    statusProductDelivered: 'Entregado al cliente',
    statusShippingToLockerAbroadDesc: 'Tu paquete va en camino al casillero en el exterior.',
    statusAtLockerAbroadDesc: 'Tu paquete ya está en el casillero en el exterior.',
    statusShippingToColombiaDesc: 'Tu paquete viene en camino a Colombia.',
    statusAtColombiaDesc: 'Tu paquete ya llegó a Colombia.',
    statusShippingToClientDesc: 'Tu paquete va en camino a tu dirección.',
    statusProductDeliveredDesc: 'Tu paquete ya fue entregado.',
    packageStatus: 'Estado de tu paquete: {{status}}',

    linkToProfile: 'Vincular producto al perfil del cliente',
    linkToProfileTitle: 'Vincular producto al perfil del cliente',
    linkToProfileMessage:
      '¿Quieres vincular esta compra al cliente {{name}}? Esta acción completará los campos del cliente con los datos de su perfil personal.',
    linkToProfileConfirm: 'Vincular',

    emptyTitle: 'Todavía no hay compras',
    emptyBody:
      'Registra la primera compra de este producto para poder seguir el avance de sus pagos.',

    deleteLabel: 'Eliminar compra',
    deleteAria: 'Eliminar la compra de {{name}}',
    deleteTitle: '¿Eliminar esta compra?',
    deleteMessage:
      'Se eliminará la compra de "{{name}}" y sus pagos registrados. No se puede deshacer.',
    deleteConfirm: 'Eliminar compra',
  },

  payments: {
    sectionTitle: 'Pagos',
    amountLabel: 'Monto del pago',
    amountHint: 'Se descuenta del saldo pendiente.',
    exceedsBalance: 'El pago no puede superar el saldo pendiente.',
    add: 'Agregar pago',
    empty: 'Todavía no hay pagos.',
    removeAria: 'Eliminar pago',
    deleteTitle: '¿Eliminar este pago?',
    deleteMessage:
      'Se eliminará el pago de {{amount}} y se recalculará el saldo. No se puede deshacer.',
    deleteConfirm: 'Eliminar pago',
  },

  extraFees: {
    sectionTitle: 'Cargos extra',
    reason: 'Motivo',
    amountLabel: 'Monto del cargo',
    amountHint: 'Se suma a lo que debe el cliente.',
    add: 'Agregar cargo extra',
    empty: 'Todavía no hay cargos extra.',
    removeAria: 'Eliminar cargo extra',
    deleteTitle: '¿Eliminar este cargo extra?',
    deleteMessage:
      'Se eliminará el cargo de {{amount}} y se recalculará el saldo. No se puede deshacer.',
    deleteConfirm: 'Eliminar cargo extra',
  },

  sales: {
    sectionTitle: 'Mis ventas',
    loading: 'Cargando ventas…',
    emptyTitle: 'Todavía no hay ventas',
    emptyBody:
      'Registra una compra en Mis productos y aparecerá aquí, con lo pagado y lo pendiente de cada cliente.',
    paidOfTotal: ' de {{total}}',
    editAria: 'Editar la compra de {{name}}',
  },

  summary: {
    allPaid: 'Todo pagado',
    owed_one: '{{count}} pendiente · {{amount}} por cobrar',
    owed_other: '{{count}} pendientes · {{amount}} por cobrar',
  },

  pagination: {
    previous: 'Anterior',
    next: 'Siguiente',
    page: 'Página {{page}} de {{total}}',
  },

  customOrders: {
    sectionTitle: 'Pedidos personalizados',
    count_one: '{{count}} pedido',
    count_other: '{{count}} pedidos',
    loading: 'Cargando pedidos…',
    emptyTitle: 'Todavía no hay pedidos personalizados',
    emptyBody:
      'Registra el primer pedido personalizado de un cliente para seguir su avance y sus pagos.',
    new: 'Nuevo pedido',
    filterClient: 'Filtrar por cliente',
    filterAllClients: 'Todos los clientes',
    searchPlaceholder: 'Buscar por nombre…',
    searchLabel: 'Buscar pedido',
    orderProgress: 'Progreso de la orden',
    paymentProgress: 'Progreso de pagos',
    creationProgress: 'Progreso de creación de la orden',
    createTitle: 'Nuevo pedido',
    editTitle: 'Editar pedido',
    create: 'Crear pedido',
    name: 'Nombre',
    description: 'Descripción',
    dateToDeliver: 'Fecha de entrega',
    lastDateToDeliver: 'Última fecha de entrega',
    owner: 'Cuenta del cliente',
    ownerPlaceholder: 'Selecciona una cuenta',
    ownerRequired: 'Debes seleccionar una cuenta',
    ownerAdmin: 'Admin',
    ownerCustomer: 'Cliente',
    agreedPrice: 'Precio acordado',
    starterPayment: 'El cliente dio un pago inicial',
    starterPaymentAmount: 'Monto del pago inicial',
    datePast: 'La fecha no puede ser anterior a hoy',
    priceMin: 'El precio debe ser un número mayor o igual a 0',
    starterPaymentMax: 'El pago inicial no puede superar el precio acordado',
    deleteLabel: 'Eliminar pedido',
    deleteTitle: '¿Eliminar este pedido?',
    deleteMessage:
      'Se eliminará "{{name}}" junto con sus pagos. No se puede deshacer.',
    deleteConfirm: 'Eliminar pedido',
  },

  adminPanel: {
    sectionTitle: 'Usuarios',
    new: 'Nuevo usuario',
    count_one: '{{count}} usuario',
    count_other: '{{count}} usuarios',
    loading: 'Cargando usuarios…',
    emptyTitle: 'Todavía no hay usuarios',
    emptyBody: 'Crea el primer usuario para que pueda iniciar sesión y ver su panel.',
    searchLabel: 'Buscar usuario',
    searchPlaceholder: 'Buscar por nombre o correo…',
    noResults: 'No hay usuarios que coincidan con tu búsqueda.',
    email: 'Correo electrónico',
    password: 'Contraseña',
    newPassword: 'Nueva contraseña',
    passwordHint: 'Déjala en blanco para conservar la actual.',
    showPassword: 'Mostrar contraseña',
    hidePassword: 'Ocultar contraseña',
    name: 'Nombre',
    role: 'Rol',
    roleAdmin: 'Admin',
    roleCustomer: 'Cliente',
    createTitle: 'Nuevo usuario',
    editTitle: 'Editar usuario',
    create: 'Crear usuario',
    disabled: 'Deshabilitado',
    disable: 'Deshabilitar',
    enable: 'Habilitar',
    deleteLabel: 'Eliminar usuario',
    deleteTitle: '¿Eliminar usuario?',
    deleteMessage: 'Se eliminará la cuenta de "{{name}}". No se puede deshacer.',
    deleteConfirm: 'Eliminar usuario',
    disableTitle: '¿Deshabilitar usuario?',
    disableMessage: '"{{name}}" no podrá iniciar sesión mientras esté deshabilitado.',
    disableConfirm: 'Deshabilitar',
    emailRequired: 'El correo electrónico es obligatorio.',
    passwordRequired: 'La contraseña es obligatoria.',
  },

  customer: {
    title: 'Mis compras',
    subtitle: 'El avance de tus compras y de tus pedidos personalizados.',
    purchasesSection: 'Mis compras',
    ordersSection: 'Mis pedidos personalizados',
    purchasesCount_one: '{{count}} compra',
    purchasesCount_other: '{{count}} compras',
    ordersCount_one: '{{count}} pedido',
    ordersCount_other: '{{count}} pedidos',
    noPurchasesTitle: 'Todavía no tienes compras',
    noPurchasesBody: 'Cuando reserves un producto, verás aquí su avance y sus pagos.',
    noOrdersTitle: 'Todavía no tienes pedidos personalizados',
    noOrdersBody: 'Cuando hagas un pedido personalizado, verás aquí su avance y sus pagos.',
    purchaseDetailTitle: 'Detalle de la compra',
    orderDetailTitle: 'Detalle del pedido',
    ordersLoading: 'Cargando pedidos…',
    purchaseDate: 'Fecha de compra',
    total: 'Total',
  },

  errors: {
    configMissing:
      'Falta configurar {{name}}. Copia .env.template a .env y rellena los valores, o defínelos en Vercel (Production y Preview) antes de construir.',
  },

  meta: {
    titleLogin: 'Iniciar sesión · Gestión de cupos',
    titleDashboard: 'Panel de gestión · Cupos',
    titleNotFound: 'Página no encontrada · Gestión de cupos',
    description: 'Gestión de cupos, compras y pagos de clientes.',
  },
};

export default es;

/**
 * The resource *shape*. Keys stay literal (so `t()` is checked against them);
 * values widen to `string`, which is what lets `en.ts` hold English text while
 * still being forced to mirror this file's structure.
 */
export type EsResources = typeof es;
