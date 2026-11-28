/**
 * English. Mirrors `es.ts` key for key and placeholder for placeholder — the
 * parity and interpolation tests fail the build if either drifts, so a missing
 * translation can never reach `main`.
 *
 * This is a translation, not a rewrite: the tone stays as dry and concrete as
 * the Spanish, and the two-letter codes in the language switch stay codes.
 */
import type { EsResources } from './es';

const en: EsResources = {
  common: {
    close: 'Close',
    cancel: 'Cancel',
    retry: 'Try again',
    edit: 'Edit',
    remove: 'Delete',
    saveChanges: 'Save changes',
    notAvailable: 'N/A',
    unnamedClient: 'Unnamed client',
    productFallback: 'No product',
    productNumber: 'Product #{{id}}',
    language: 'Language',
    switchToEnglish: 'Switch to English',
    switchToSpanish: 'Switch to Spanish',
    imagePlaceholder: 'No image',
  },

  /** Shared confirmation dialogs. Per-action wording is passed in by the caller. */
  confirm: {
    title: 'Confirm action?',
  },

  nav: {
    skipToContent: 'Skip to content',
    signOut: 'Sign out',
    dashboardTitle: 'Management panel',
    dashboardSubtitle: 'Your catalogue, your clients’ purchases and their payments.',
    refresh: 'Refresh',
    refreshAria: 'Refresh products and sales',
    tabsAria: 'Panel sections',
    tabProducts: 'My products',
    tabOrders: 'My orders',
    tabAdmin: 'Admin panel',
  },

  auth: {
    eyebrow: 'And more.',
    wordmark: 'Slot management',
    title: 'Sign in',
    subtitle: 'Sign in with your email and password to open your panel.',
    email: 'Email',
    emailPlaceholder: 'name@example.com',
    password: 'Password',
    submit: 'Sign in',
    submitting: 'Signing in…',
    verifyingSession: 'Checking your session…',
  },

  products: {
    sectionTitle: 'My products',
    count_one: '{{count}} product',
    count_other: '{{count}} products',
    loading: 'Loading products…',
    emptyTitle: 'No products yet',
    emptyBody:
      'Publish your first slot so you can record your clients’ purchases and track their payments.',
    idBadge: 'ID: {{id}}',
    purchasesCount_one: '{{count}} purchase',
    purchasesCount_other: '{{count}} purchases',

    new: 'New product',
    createTitle: 'New product',
    editTitle: 'Edit product',
    create: 'Create product',
    closeFormAria: 'Close form',
    name: 'Name',
    description: 'Description',
    value: 'Value',
    releaseDate: 'Release date',
    image: 'Image',
    imageHint: 'JPG or PNG. Saving replaces the current image.',
    removeCurrentImageAria: 'Delete image',
    discardSelectedImageAria: 'Remove image',

    detailDescription: 'Description',
    detailRelease: 'Release',
    detailValue: 'Value',
    detailPurchases: 'Purchases',
    openPurchases: 'Purchases',

    deleteTitle: 'Delete product?',
    deleteMessage:
      '"{{name}}" will be deleted along with its purchases and payments. This cannot be undone.',
    deleteConfirm: 'Delete product',
  },

  purchases: {
    title: 'Purchases of {{product}}',
    add: 'Add purchase',
    addTitle: 'Add purchase',
    editTitle: 'Edit purchase',
    clientName: 'Client name',
    firstName: 'First name',
    phone: 'Phone',
    socialMedia: 'Social media contact',
    socialMediaEmpty: 'Select…',
    socialMessenger: 'Messenger',
    socialWhatsapp: 'WhatsApp',
    socialFacebook: 'Facebook',
    socialInstagram: 'Instagram',
    socialTiktok: 'TikTok',
    agreedPrice: 'Agreed price',
    register: 'Record purchase',
    productLabel: 'Product: {{name}}',
    paid: 'Paid',
    pending: 'Pending',
    owner: 'Customer account',
    noOwner: 'No account',
    ownerAdmin: 'Admin',
    ownerCustomer: 'Customer',
    status: 'Status',
    statusShippingToLockerAbroad: 'Shipping to locker abroad',
    statusAtLockerAbroad: 'At locker abroad',
    statusShippingToColombia: 'Shipping to Colombia',
    statusAtColombia: 'In Colombia',
    statusShippingToClient: 'Shipping to client',
    statusProductDelivered: 'Delivered to customer',
    statusShippingToLockerAbroadDesc: 'Your package is on its way to the locker abroad.',
    statusAtLockerAbroadDesc: 'Your package is at the locker abroad.',
    statusShippingToColombiaDesc: 'Your package is on its way to Colombia.',
    statusAtColombiaDesc: 'Your package has arrived in Colombia.',
    statusShippingToClientDesc: 'Your package is on its way to your address.',
    statusProductDeliveredDesc: 'Your package has been delivered.',
    packageStatus: 'Your package status: {{status}}',

    linkToProfile: 'Link product to client profile',
    linkToProfileTitle: 'Link product to client profile',
    linkToProfileMessage:
      "Do you want to link this product purchase to the client {{name}}? This action will fill the client data fields with the ones from the client's personal profile.",
    linkToProfileConfirm: 'Link',

    emptyTitle: 'No purchases yet',
    emptyBody:
      'Record this product’s first purchase so you can follow the progress of its payments.',

    deleteLabel: 'Delete purchase',
    deleteAria: 'Delete {{name}}’s purchase',
    deleteTitle: 'Delete this purchase?',
    deleteMessage:
      '{{name}}’s purchase and its recorded payments will be deleted. This cannot be undone.',
    deleteConfirm: 'Delete purchase',
  },

  payments: {
    sectionTitle: 'Payments',
    amountLabel: 'Payment amount',
    amountHint: 'Deducted from the outstanding balance.',
    exceedsBalance: 'The payment cannot exceed the remaining balance.',
    add: 'Add payment',
    empty: 'No payments yet.',
    removeAria: 'Delete payment',
    deleteTitle: 'Delete this payment?',
    deleteMessage:
      'The payment of {{amount}} will be deleted and the balance recalculated. This cannot be undone.',
    deleteConfirm: 'Delete payment',
  },

  extraFees: {
    sectionTitle: 'Extra charges',
    reason: 'Reason',
    amountLabel: 'Charge amount',
    amountHint: 'Added to what the client owes.',
    add: 'Add extra charge',
    empty: 'No extra charges yet.',
    removeAria: 'Delete extra charge',
    deleteTitle: 'Delete this extra charge?',
    deleteMessage:
      'The charge of {{amount}} will be deleted and the balance recalculated. This cannot be undone.',
    deleteConfirm: 'Delete extra charge',
  },

  sales: {
    sectionTitle: 'My sales',
    loading: 'Loading sales…',
    emptyTitle: 'No sales yet',
    emptyBody:
      'Record a purchase under My products and it will show up here, with what each client has paid and what they still owe.',
    paidOfTotal: ' of {{total}}',
    editAria: 'Edit {{name}}’s purchase',
  },

  summary: {
    allPaid: 'All paid',
    owed_one: '{{count}} pending · {{amount}} owed',
    owed_other: '{{count}} pending · {{amount}} owed',
  },

  pagination: {
    previous: 'Previous',
    next: 'Next',
    page: 'Page {{page}} of {{total}}',
  },

  customOrders: {
    sectionTitle: 'Custom orders',
    count_one: '{{count}} order',
    count_other: '{{count}} orders',
    loading: 'Loading orders…',
    emptyTitle: 'No custom orders yet',
    emptyBody:
      'Record a client’s first custom order to follow its progress and payments.',
    new: 'New order',
    filterClient: 'Filter by client',
    filterAllClients: 'All clients',
    searchPlaceholder: 'Search by name…',
    searchLabel: 'Search order',
    orderProgress: 'Order progress',
    paymentProgress: 'Payment progress',
    creationProgress: 'Order creation progress',
    createTitle: 'New order',
    editTitle: 'Edit order',
    create: 'Create order',
    name: 'Name',
    description: 'Description',
    dateToDeliver: 'Delivery date',
    lastDateToDeliver: 'Last delivery date',
    owner: 'Customer account',
    ownerPlaceholder: 'Select an account',
    ownerRequired: 'You must select an account',
    ownerAdmin: 'Admin',
    ownerCustomer: 'Customer',
    agreedPrice: 'Agreed price',
    starterPayment: 'The client made a starter payment',
    starterPaymentAmount: 'Starter payment amount',
    datePast: 'The date cannot be earlier than today',
    priceMin: 'The price must be a number greater than or equal to 0',
    starterPaymentMax: 'The starter payment cannot exceed the agreed price',
    deleteLabel: 'Delete order',
    deleteTitle: 'Delete this order?',
    deleteMessage:
      '"{{name}}" will be deleted along with its payments. This cannot be undone.',
    deleteConfirm: 'Delete order',
  },

  adminPanel: {
    sectionTitle: 'Users',
    new: 'New user',
    count_one: '{{count}} user',
    count_other: '{{count}} users',
    loading: 'Loading users…',
    emptyTitle: 'No users yet',
    emptyBody: 'Create the first user so they can sign in and see their panel.',
    searchLabel: 'Search user',
    searchPlaceholder: 'Search by name or email…',
    noResults: 'No users match your search.',
    email: 'Email',
    password: 'Password',
    newPassword: 'New password',
    passwordHint: 'Leave blank to keep the current one.',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    name: 'Name',
    role: 'Role',
    roleAdmin: 'Admin',
    roleCustomer: 'Customer',
    createTitle: 'New user',
    editTitle: 'Edit user',
    create: 'Create user',
    disabled: 'Disabled',
    disable: 'Disable',
    enable: 'Enable',
    deleteLabel: 'Delete user',
    deleteTitle: 'Delete user?',
    deleteMessage: 'The account of "{{name}}" will be deleted. This cannot be undone.',
    deleteConfirm: 'Delete user',
    disableTitle: 'Disable user?',
    disableMessage: '"{{name}}" will not be able to sign in while disabled.',
    disableConfirm: 'Disable',
    emailRequired: 'Email is required.',
    passwordRequired: 'Password is required.',
  },

  customer: {
    title: 'My purchases',
    subtitle: 'The progress of your purchases and custom orders.',
    purchasesSection: 'My purchases',
    ordersSection: 'My custom orders',
    purchasesCount_one: '{{count}} purchase',
    purchasesCount_other: '{{count}} purchases',
    ordersCount_one: '{{count}} order',
    ordersCount_other: '{{count}} orders',
    noPurchasesTitle: 'You have no purchases yet',
    noPurchasesBody: 'When you reserve a product, its progress and payments will show here.',
    noOrdersTitle: 'You have no custom orders yet',
    noOrdersBody: 'When you place a custom order, its progress and payments will show here.',
    purchaseDetailTitle: 'Purchase detail',
    orderDetailTitle: 'Order detail',
    ordersLoading: 'Loading orders…',
    purchaseDate: 'Purchase date',
    total: 'Total',
  },

  errors: {
    configMissing:
      '{{name}} is not configured. Copy .env.template to .env and fill in the values, or set them in Vercel (Production and Preview) before building.',
  },

  meta: {
    titleLogin: 'Sign in · Slot management',
    titleDashboard: 'Management panel · Slots',
    titleNotFound: 'Page not found · Slot management',
    description: 'Manage slots, purchases and client payments.',
  },
};

export default en;
