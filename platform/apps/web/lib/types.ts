// Bentuk data dari API Shopia (lihat apps/api)
export interface ProductCard {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  discountPercent: number;
  hasMultiplePrices: boolean;
  imageUrl: string | null;
  ratingAvg: number;
  ratingCount: number;
  soldCount: number;
  inStock: boolean;
  isNew: boolean;
  store: { name: string; slug: string; city: string | null; isUmkm: boolean };
  category: { name: string; slug: string; icon: string | null };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

export interface SearchResult {
  items: ProductCard[];
  total: number;
  page: number;
  limit: number;
  keywords: string[];
  relaxed: boolean;
}

export interface AiSearchResult extends SearchResult {
  understood: string[];
  source: "ai" | "rules";
  filters: { keywords: string[]; category: string | null; minPrice: number | null; maxPrice: number | null; minRating: number | null; sort: string | null };
}

export interface ProductDetail {
  id: string;
  name: string;
  description: string;
  attributes: Record<string, string>;
  tags: string[];
  ratingAvg: number;
  ratingCount: number;
  soldCount: number;
  totalStock: number;
  category: { name: string; slug: string; icon: string | null };
  images: { url: string; alt: string | null }[];
  variants: { id: string; name: string; options: Record<string, string>; price: number; compareAtPrice: number | null; stock: number; weightGram: number }[];
  store: { id: string; name: string; slug: string; city: string | null; isUmkm: boolean; logoUrl: string | null; createdAt: string; activeProducts: number };
  reviews: { id: string; rating: number; comment: string | null; createdAt: string; variantName: string; author: string }[];
  ratingBreakdown: Record<string, number>;
}

export interface CartLine {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  imageUrl: string | null;
  price: number;
  compareAtPrice: number | null;
  quantity: number;
  stock: number;
  lineTotal: number;
  issue: string | null;
}

export interface Cart {
  groups: { store: { id: string; name: string; slug: string; city: string | null }; items: CartLine[]; subtotal: number }[];
  subtotal: number;
  count: number;
  hasIssues: boolean;
}

export interface Me {
  id: string;
  email: string;
  name: string | null;
  roles: ("BUYER" | "SELLER" | "ADMIN")[];
  store: { id: string; name: string; slug: string; status: "PENDING" | "ACTIVE" | "SUSPENDED" } | null;
  unreadNotifications: number;
  cartCount: number;
}

export interface Address {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  line1: string;
  city: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
}
