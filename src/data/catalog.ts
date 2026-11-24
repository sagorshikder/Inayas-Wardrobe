import catWardrobe from '../assets/images/cat_wardrobe_1795141550017.webp';
import catBedroom from '../assets/images/cat_bedroom_1795141549958.webp';
import catLivingRoom from '../assets/images/cat_living_room_1795141550410.webp';
import catDining from '../assets/images/cat_dining_1795141551827.webp';
import catStorage from '../assets/images/cat_storage_1795141550714.webp';
import catCustomFurniture from '../assets/images/cat_custom_furniture_1795141550732.webp';
import catDressingTable from '../assets/images/cat_dressing_table_1795141568779.webp';
import catStudyTable from '../assets/images/cat_study_table_1795141568750.webp';
import catTvCabinet from '../assets/images/cat_tv_cabinet_1795141571064.webp';
import catCoffeeTable from '../assets/images/cat_coffee_table_1795141571357.webp';
import catShoeRack from '../assets/images/cat_shoe_rack_1795141570729.webp';
import catBookshelf from '../assets/images/cat_bookshelf_1795141570974.webp';

import galleryWatermark from '../assets/images/gallery_watermark_1795141805943.webp';
import feature3dBg from '../assets/images/feature_3d_bg_1795142419466.webp';
import customDesignBg from '../assets/images/custom_design_bg_1795143367170.webp';
import followUsBg from '../assets/images/follow_us_bg_1795145731231.webp';

import trustQuality from '../assets/images/trust_quality_1795143497714.webp';
import trustPrice from '../assets/images/trust_price_1795143498196.webp';
import trustDelivery from '../assets/images/trust_delivery_1795143498898.webp';
import trustSupportPortrait from '../assets/images/trust_support_portrait.webp';

import prodSlidingWardrobe from '../assets/images/prod_sliding_wardrobe_1795173611483.webp';
import prodHingedWardrobe from '../assets/images/prod_hinged_wardrobe_1795173612542.webp';
import prodRoyalBed from '../assets/images/prod_royal_bed_1795173611793.webp';
import aboutWorkshop from '../assets/images/about_workshop_1795173612517.webp';
import brandLogo from '../assets/images/brand_logo.webp';
import heroCover from '../assets/images/hero_cover.webp';

export interface ProductRecord {
  id: string;
  name: string;
  cat: string;
  price: number;
  old?: number;
  desc: string;
  tag?: string;
  rating: number;
  reviews: number;
  image: string;
  thumb?: string;
  images?: string[];
}

export interface CategoryRecord {
  key: string;
  name: string;
  queryCat: string;
  image: string;
}

export interface GalleryRecord {
  id: string;
  cat: string;
  title: string;
  image: string;
}

export interface ReviewRecord {
  id: string;
  name: string;
  text: string;
  stars: number;
}

export interface SiteTextConfig {
  hero_eyebrow: string;
  hero_title: string;
  hero_text: string;
  hero_btn1: string;
  hero_btn2: string;
  hero_chip: string;
  phone: string;
  wa: string;
  address: string;
  fb: string;
  ig: string;
  tt: string;
  tagline: string;
  g_title: string;
  g_text: string;
  f_title: string;
  f_text: string;
  c_title: string;
  c_text: string;
  foot_text: string;
  copy: string;
  pay_bkash_nagad: string;
  pay_rocket: string;
  pay_ibbl: string;
}

export const STUDIO_MEDIA = {
  logo: brandLogo,
  heroCover,
  galleryWatermark,
  feature3dBg,
  customDesignBg,
  followUsBg,
  trustQuality,
  trustPrice,
  trustDelivery,
  // Optimized WebP version of the user's customer support portrait
  trustSupportPortrait,
  aboutWorkshop,
};

export const DEFAULT_SITE_TEXT: SiteTextConfig = {
  hero_eyebrow: 'Premium furniture collection',
  hero_title: 'Transform Your Space with Timeless Elegance.',
  hero_text:
    'Discover high-quality furniture and custom wardrobe solutions designed to make your home more beautiful, functional and uniquely yours.',
  hero_btn1: 'Explore Collection →',
  hero_btn2: 'Customize Your Wardrobe',
  hero_chip: 'Custom wardrobe, made to your size',
  phone: '+880 1714-000349',
  wa: '8801714000349',
  address: 'Pangsha-Rajbari, Bangladesh',
  fb: 'https://www.facebook.com/share/1FZzyT7ius/',
  ig: 'https://www.instagram.com/',
  tt: 'https://www.tiktok.com/@wardrobe204?_r=1&_t=ZS-9BYwP3OWRLp',
  tagline: 'Quality Furniture | Custom Design | Trusted by Thousands',
  g_title: 'Our Gallery',
  g_text: 'See how our furniture looks in real homes.',
  f_title: '3D View & Customization',
  f_text: 'Explore our furniture in 3D, change colors, and customize your perfect design.',
  c_title: 'Need a Custom Design?',
  c_text: 'Your size. Your style. Your choice.',
  foot_text: 'Elegance Crafted for Your Home.',
  copy: "© 2026 INAYA'S WARDROBE. All rights reserved.",
  pay_bkash_nagad: '01714000350',
  pay_rocket: '017140003504',
  pay_ibbl: '20503900200723012',
};

export const STORE_CATEGORIES: CategoryRecord[] = [
  { key: 'cat1', name: 'Wardrobe', queryCat: 'Wardrobe', image: catWardrobe },
  { key: 'cat2', name: 'Bedroom', queryCat: 'Bedroom', image: catBedroom },
  { key: 'cat3', name: 'Living Room', queryCat: 'Living Room', image: catLivingRoom },
  { key: 'cat4', name: 'Dining', queryCat: 'Dining', image: catDining },
  { key: 'cat5', name: 'Storage', queryCat: 'Storage', image: catStorage },
  { key: 'cat6', name: 'Custom Furniture', queryCat: 'Custom Furniture', image: catCustomFurniture },
  { key: 'cat7', name: 'Dressing Table', queryCat: 'Dressing Table', image: catDressingTable },
  { key: 'cat8', name: 'Study Table', queryCat: 'Study Table', image: catStudyTable },
  { key: 'cat9', name: 'TV Cabinet', queryCat: 'TV Cabinet', image: catTvCabinet },
  { key: 'cat10', name: 'Coffee Table', queryCat: 'Coffee Table', image: catCoffeeTable },
  { key: 'cat11', name: 'Shoe Rack', queryCat: 'Shoe Rack', image: catShoeRack },
  { key: 'cat12', name: 'Bookshelf', queryCat: 'Bookshelf', image: catBookshelf },
];

export const DEFAULT_PRODUCTS: ProductRecord[] = [
  {
    id: '1',
    name: 'Sliding Door Wardrobe',
    cat: 'Wardrobe',
    price: 48500,
    old: 55000,
    desc: 'Sliding doors with soft-close channels, brushed brass pulls, hanging rail and inner drawers. Made to your exact room size.',
    tag: 'Bestseller',
    rating: 4.9,
    reviews: 98,
    image: prodSlidingWardrobe,
    images: [prodSlidingWardrobe, catWardrobe],
  },
  {
    id: '2',
    name: 'Royal Queen Size Bed',
    cat: 'Bedroom',
    price: 38000,
    old: 0,
    desc: 'Seasoned solid timber frame with tailored linen cushioned headboard and optional under-bed hydraulic storage.',
    tag: 'Popular',
    rating: 4.8,
    reviews: 76,
    image: prodRoyalBed,
    images: [prodRoyalBed, catBedroom],
  },
  {
    id: '3',
    name: 'Modern 3-Seater Sofa',
    cat: 'Living Room',
    price: 32000,
    old: 36500,
    desc: 'High-density orthopedic foam seating upholstered in breathable woven linen on a kiln-dried timber frame.',
    tag: 'New',
    rating: 4.8,
    reviews: 67,
    image: catLivingRoom,
    images: [catLivingRoom],
  },
  {
    id: '4',
    name: '6-Seater Dining Set',
    cat: 'Dining',
    price: 42000,
    old: 0,
    desc: 'Six sculpted dining chairs paired with a generous walnut-finished dining table. Durable stain-resistant surface.',
    rating: 4.7,
    reviews: 43,
    image: catDining,
    images: [catDining],
  },
  {
    id: '5',
    name: 'Hinged 3-Door Wardrobe',
    cat: 'Wardrobe',
    price: 36000,
    old: 0,
    desc: 'Classic three-door hinged wardrobe crafted in natural oak veneer with a full-length central dressing mirror.',
    tag: 'Popular',
    rating: 4.8,
    reviews: 124,
    image: prodHingedWardrobe,
    images: [prodHingedWardrobe, catWardrobe],
  },
  {
    id: '6',
    name: 'Architectural Storage Cabinet',
    cat: 'Storage',
    price: 18500,
    old: 0,
    desc: 'Multi-shelf closed cabinet tailored for books, linens, or dining essentials with soft-close hinges.',
    rating: 4.6,
    reviews: 39,
    image: catStorage,
    images: [catStorage],
  },
  {
    id: '7',
    name: 'Dressing Table with Mirror',
    cat: 'Dressing Table',
    price: 15500,
    old: 17000,
    desc: 'Architectural dressing vanity with framed mirror, smooth drawers, and cushioned stool option.',
    rating: 4.6,
    reviews: 54,
    image: catDressingTable,
    images: [catDressingTable],
  },
  {
    id: '8',
    name: 'Minimalist TV Cabinet',
    cat: 'TV Cabinet',
    price: 21000,
    old: 0,
    desc: 'Low-profile walnut media console with concealed cable routing and spacious closed compartments.',
    rating: 4.7,
    reviews: 41,
    image: catTvCabinet,
    images: [catTvCabinet],
  },
  {
    id: '9',
    name: 'Sculpted Coffee Table',
    cat: 'Coffee Table',
    price: 9500,
    old: 0,
    desc: 'Compact architectural centerpiece table with natural wood grain top and matte sealed finish.',
    rating: 4.5,
    reviews: 28,
    image: catCoffeeTable,
    images: [catCoffeeTable],
  },
  {
    id: '10',
    name: '4-Seater Apartment Dining Set',
    cat: 'Dining',
    price: 29000,
    old: 32000,
    desc: 'Space-conscious dining table and four ergonomic chairs designed for modern urban apartments.',
    rating: 4.7,
    reviews: 35,
    image: catDining,
    images: [catDining],
  },
  {
    id: '11',
    name: 'Slim Shoe Rack Cabinet',
    cat: 'Shoe Rack',
    price: 8500,
    old: 0,
    desc: 'Entryway shoe organizer with ventilated flip-down compartments and durable melamine interior.',
    rating: 4.6,
    reviews: 31,
    image: catShoeRack,
    images: [catShoeRack],
  },
  {
    id: '12',
    name: 'Custom Study & Work Desk',
    cat: 'Study Table',
    price: 16000,
    old: 0,
    desc: 'Built to your room width with integrated drawer tower and overhead bookshelf shelving.',
    rating: 4.8,
    reviews: 47,
    image: catStudyTable,
    images: [catStudyTable, catBookshelf],
  },
];

export const DEFAULT_GALLERY: GalleryRecord[] = [
  { id: 'g1', cat: 'Wardrobe', title: 'Walnut Sliding Suite — Dhanmondi', image: prodSlidingWardrobe },
  { id: 'g2', cat: 'Bedroom', title: 'Master Suite Platform Bed — Uttara', image: prodRoyalBed },
  { id: 'g3', cat: 'Living Room', title: 'Modern Linen Living Room — Banani', image: catLivingRoom },
  { id: 'g4', cat: 'Dining', title: '6-Seater Walnut Dining — Pangsha', image: catDining },
  { id: 'g5', cat: 'Wardrobe', title: '3-Door Oak Hinged Wardrobe — Mirpur', image: prodHingedWardrobe },
  { id: 'g6', cat: 'Bedroom', title: 'Dressing Vanity & Wardrobe — Gulshan', image: catDressingTable },
  { id: 'g7', cat: 'Living Room', title: 'Custom Media Console — Bashundhara', image: catTvCabinet },
  { id: 'g8', cat: 'Storage', title: 'Architectural Wall Bookshelf — Rajbari', image: catBookshelf },
];

export const DEFAULT_REVIEWS: ReviewRecord[] = [
  {
    id: 'r1',
    name: 'Farhana Rahman · Dhaka',
    stars: 5,
    text: 'Ordered an 8-foot sliding wardrobe customized in Walnut Brown. The measuring visit was punctual and the soft-close channels feel rock solid.',
  },
  {
    id: 'r2',
    name: 'Tanvir Ahmed · Rajbari',
    stars: 5,
    text: 'The Royal Queen Size Bed and Dressing Table arrived right on schedule. Solid finish, zero wobbling, and transparent pricing.',
  },
  {
    id: 'r3',
    name: 'Nusrat Jahan · Uttara',
    stars: 5,
    text: 'Used the 3D Wardrobe studio to pick Natural Oak before ordering on WhatsApp—the delivered wardrobe matched our preview down to the brass pulls.',
  },
];
