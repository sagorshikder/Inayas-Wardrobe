export type Lang = 'en' | 'bn';

export interface Translations {
  langToggle: string;
  tagline: string;
  whatsappChat: string;
  nav: {
    home: string;
    shop: string;
    wardrobe: string;
    bedroom: string;
    living: string;
    dining: string;
    gallery: string;
    studio3d: string;
    about: string;
    contact: string;
    admin: string;
  };
  searchPlaceholder: string;
  shopByCategoryTitle: string;
  shopByCategorySub: string;
  bestSellingTitle: string;
  bestSellingSub: string;
  viewAll: string;
  viewDetails: string;
  addToCart: string;
  orderNow: string;
  viewGallery: string;
  newFeature: string;
  try3dView: string;
  requestQuote: string;
  reviewsHeading: string;
  cartTitle: string;
  cartEmpty: string;
  totalLabel: string;
  placeOrder: string;
  orderOnWhatsApp: string;
  weAccept: string;
  quickLinks: string;
  contactUs: string;
  trust: {
    quality: string;
    price: string;
    delivery: string;
    support: string;
  };
  followUs: string;
  followDesc: string;
}

export const TRANSLATIONS: Record<Lang, Translations> = {
  en: {
    langToggle: 'বাংলা',
    tagline: 'Quality Furniture | Custom Design | Trusted by Thousands',
    whatsappChat: 'Chat on WhatsApp',
    nav: {
      home: 'Home',
      shop: 'Shop',
      wardrobe: 'Wardrobe',
      bedroom: 'Bedroom',
      living: 'Living Room',
      dining: 'Dining',
      gallery: 'Gallery',
      studio3d: '3D View',
      about: 'About Us',
      contact: 'Contact',
      admin: 'Admin',
    },
    searchPlaceholder: 'Search for furniture...',
    shopByCategoryTitle: 'Shop By Category',
    shopByCategorySub: 'Find the perfect piece for every corner of your home.',
    bestSellingTitle: 'Best Selling Products',
    bestSellingSub: 'Top picks loved by our customers.',
    viewAll: 'View All →',
    viewDetails: 'View Details',
    addToCart: 'Add to cart',
    orderNow: 'Order now',
    viewGallery: 'View Gallery →',
    newFeature: 'New feature',
    try3dView: 'Try 3D View →',
    requestQuote: 'Request a Quote →',
    reviewsHeading: 'What Our Customers Say',
    cartTitle: 'Your Cart',
    cartEmpty: 'Your cart is empty. Add a piece from the collection.',
    totalLabel: 'Total',
    placeOrder: 'Place Order',
    orderOnWhatsApp: 'Order via WhatsApp',
    weAccept: 'We Accept',
    quickLinks: 'Quick Links',
    contactUs: 'Contact Us',
    trust: {
      quality: 'Premium Quality',
      price: 'Affordable Price',
      delivery: 'On-Time Delivery',
      support: 'Customer Support',
    },
    followUs: 'Follow Us',
    followDesc: 'Get the latest updates, new arrivals & exclusive offers.',
  },
  bn: {
    langToggle: 'English',
    tagline: 'মানসম্মত ফার্নিচার | কাস্টম ডিজাইন | হাজারো গ্রাহকের আস্থা',
    whatsappChat: 'হোয়াটসঅ্যাপে কথা বলুন',
    nav: {
      home: 'হোম',
      shop: 'শপ',
      wardrobe: 'ওয়ারড্রোব',
      bedroom: 'বেডরুম',
      living: 'লিভিং রুম',
      dining: 'ডাইনিং',
      gallery: 'গ্যালারি',
      studio3d: '৩ডি ভিউ',
      about: 'আমাদের সম্পর্কে',
      contact: 'যোগাযোগ',
      admin: 'অ্যাডমিন',
    },
    searchPlaceholder: 'ফার্নিচার খুঁজুন...',
    shopByCategoryTitle: 'ক্যাটাগরি অনুযায়ী দেখুন',
    shopByCategorySub: 'আপনার ঘরের প্রতিটি কোণের জন্য সেরা ফার্নিচার।',
    bestSellingTitle: 'সেরা বিক্রিত ফার্নিচার',
    bestSellingSub: 'আমাদের গ্রাহকদের সবচেয়ে পছন্দের কালেকশন।',
    viewAll: 'সব দেখুন →',
    viewDetails: 'বিস্তারিত দেখুন',
    addToCart: 'কার্টে যোগ করুন',
    orderNow: 'অর্ডার করুন',
    viewGallery: 'গ্যালারি দেখুন →',
    newFeature: 'নতুন ফিচার',
    try3dView: '৩ডি ভিউ দেখুন →',
    requestQuote: 'কাস্টম কোট নিন →',
    reviewsHeading: 'গ্রাহকদের মতামত',
    cartTitle: 'আপনার কার্ট',
    cartEmpty: 'আপনার কার্ট খালি। একটি পণ্য যোগ করুন।',
    totalLabel: 'মোট',
    placeOrder: 'অর্ডার নিশ্চিত করুন',
    orderOnWhatsApp: 'WhatsApp-এ অর্ডার করুন',
    weAccept: 'পেমেন্ট মাধ্যম',
    quickLinks: 'গুরুত্বপূর্ণ লিংক',
    contactUs: 'যোগাযোগ করুন',
    trust: {
      quality: 'সেরা মান',
      price: 'সাধ্যের মধ্যে দাম',
      delivery: 'সময়মতো ডেলিভারি',
      support: 'কাস্টমার সাপোর্ট',
    },
    followUs: 'আমাদের ফলো করুন',
    followDesc: 'নতুন কালেকশন এবং অফার সম্পর্কে জানতে ফলো করুন।',
  },
};
