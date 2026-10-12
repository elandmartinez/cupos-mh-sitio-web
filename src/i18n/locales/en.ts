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
    phone: 'Phone',
    agreedFees: 'Agreed fee',
    register: 'Record purchase',
    productLabel: 'Product: {{name}}',
    paid: 'Paid',
    pending: 'Pending',

    emptyTitle: 'No purchases yet',
    emptyBody:
      'Record this product’s first purchase so you can follow the progress of its payments.',

    deleteAria: 'Delete {{name}}’s purchase',
    deleteTitle: 'Delete this purchase?',
    deleteMessage:
      '{{name}}’s purchase and its recorded payments will be deleted. This cannot be undone.',
    deleteConfirm: 'Delete purchase',
  },

  payments: {
    amountLabel: 'Payment amount',
    amountHint: 'Deducted from the outstanding balance.',
    extraFee: 'Extra charge',
    extraSuffix: ' (extra)',
    add: 'Add payment',
    empty: 'No payments yet. Record the first one with the form above.',
    removeAria: 'Delete payment',
    deleteTitle: 'Delete this payment?',
    deleteMessage:
      'The payment of {{amount}} will be deleted and the balance recalculated. This cannot be undone.',
    deleteConfirm: 'Delete payment',
  },

  sales: {
    sectionTitle: 'My sales',
    loading: 'Loading sales…',
    emptyTitle: 'No sales yet',
    emptyBody:
      'Record a purchase under My products and it will show up here, with what each client has paid and what they still owe.',
    paidOfTotal: ' of {{total}}',
  },

  summary: {
    allPaid: 'All paid',
    owed_one: '{{count}} pending · {{amount}} owed',
    owed_other: '{{count}} pending · {{amount}} owed',
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
