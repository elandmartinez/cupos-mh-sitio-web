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
    phone: 'Teléfono',
    agreedFees: 'Tarifa acordada',
    register: 'Registrar compra',
    productLabel: 'Producto: {{name}}',
    paid: 'Pagado',
    pending: 'Pendiente',

    emptyTitle: 'Todavía no hay compras',
    emptyBody:
      'Registra la primera compra de este producto para poder seguir el avance de sus pagos.',

    deleteAria: 'Eliminar la compra de {{name}}',
    deleteTitle: '¿Eliminar esta compra?',
    deleteMessage:
      'Se eliminará la compra de "{{name}}" y sus pagos registrados. No se puede deshacer.',
    deleteConfirm: 'Eliminar compra',
  },

  payments: {
    amountLabel: 'Monto del pago',
    amountHint: 'Se descuenta del saldo pendiente.',
    extraFee: 'Cargo extra',
    extraSuffix: ' (extra)',
    add: 'Agregar pago',
    empty: 'Todavía no hay pagos. Registra el primer abono con el formulario de arriba.',
    removeAria: 'Eliminar pago',
    deleteTitle: '¿Eliminar este pago?',
    deleteMessage:
      'Se eliminará el pago de {{amount}} y se recalculará el saldo. No se puede deshacer.',
    deleteConfirm: 'Eliminar pago',
  },

  sales: {
    sectionTitle: 'Mis ventas',
    loading: 'Cargando ventas…',
    emptyTitle: 'Todavía no hay ventas',
    emptyBody:
      'Registra una compra en Mis productos y aparecerá aquí, con lo pagado y lo pendiente de cada cliente.',
    paidOfTotal: ' de {{total}}',
  },

  summary: {
    allPaid: 'Todo pagado',
    owed_one: '{{count}} pendiente · {{amount}} por cobrar',
    owed_other: '{{count}} pendientes · {{amount}} por cobrar',
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
