export interface ProductSize {
  id: number;
  product_id: number;
  size: string;
  price: number;
}


interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  onCheckout: (product: Product, sizeId: number, quantidade: number) => void;
}

export interface Campaign {
  id: number;
  nome: string;
  marca: string;
  gender_id: number;
  data_inicio: string;
  data_fim: string;
}

export interface ProductColorSize {
  id: number;
  product_color_id: number;
  size: string;
  price: string | null;
}

export interface ProductColorImage {
  product_color_id: number;
  image_path: string;
  thumbnail_path?: string;
}

export interface ProductColor {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  nome: string;
  descricao: string | null;
  preco: number;
  images: string[];
  campaign?: Campaign;
  colorSizes?: ProductColorSize[];
  colorImages?: ProductColorImage[];
  productColors?: ProductColor[];
}