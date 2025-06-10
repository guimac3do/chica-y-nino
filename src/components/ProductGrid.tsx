import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ProductModal } from '@/components/ProductModal';
import axios from 'axios';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { FilterModal } from './FilterModal';
import { useFilter } from '@/context/FilterContext';
import { Product, Campaign } from '@/types/product';

const API_URL = "http://localhost:8002/api";
const STORAGE_URL = "http://localhost:8002";

interface FilterValues {
  priceRange: [number, number] | null;
  sizes: string[];
  colors: string[];
  gender: string;
}

const ProductsGrid: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [hoveredProductId, setHoveredProductId] = useState<number | null>(null);
  const { isFilterModalOpen, setFilterModalOpen } = useFilter();
  const [filters, setFilters] = useState<FilterValues>({
    priceRange: null,
    sizes: [],
    colors: [],
    gender: 'all',
  });
  const location = useLocation();
  const navigate = useNavigate();
  const { id: campaignId } = useParams<{ id?: string }>();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (campaignId) {
      const campaign = campaigns.find(c => c.id === parseInt(campaignId));
      if (campaign) {
        const now = new Date();
        const startDate = new Date(campaign.data_inicio);
        const endDate = new Date(campaign.data_fim);
        if (startDate > now || endDate < now) {
          navigate('/');
          return;
        }
      }
    }
    fetchProducts();
  }, [campaigns, campaignId, filters]);

  useEffect(() => {
    applyFilters();
  }, [filters, allProducts]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const genderParam = params.get('genero');
    if (genderParam === 'menino' && filters.gender !== 'masculino') {
      setFilters((prev) => ({ ...prev, gender: 'masculino' }));
    } else if (genderParam === 'menina' && filters.gender !== 'feminino') {
      setFilters((prev) => ({ ...prev, gender: 'feminino' }));
    } else if (!genderParam && filters.gender !== 'all') {
      setFilters((prev) => ({ ...prev, gender: 'all' }));
    }
  }, [location.search]);

  const fetchCampaigns = async () => {
    try {
      const response = await axios.get(`${API_URL}/campanhas`);
      setCampaigns(response.data);
    } catch (error) {
      console.error('Erro ao buscar campanhas:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const url = `${API_URL}/products${campaignId ? `?campanhaId=${campaignId}` : ''}`;
      console.log('Buscando produtos em:', url);
      const response = await axios.get(url); // Sem header de autenticação
      console.log('Produtos recebidos:', response.data);

      const activeProducts: Product[] = response.data
        .map((product: any) => ({
          id: product.id,
          nome: product.nome,
          descricao: product.descricao,
          preco: parseFloat(product.preco),
          images: product.images,
          campaign: product.campaign,
          colorSizes: product.color_sizes,
          colorImages: product.color_images,
          productColors: product.product_colors,
        }))
        .filter((product: Product) => {
          const campaign = product.campaign;
          if (!campaign) return false;
          const now = new Date();
          const startDate = new Date(campaign.data_inicio);
          const endDate = new Date(campaign.data_fim);
          return startDate <= now && endDate >= now;
        });

      console.log('Produtos ativos:', activeProducts);
      setAllProducts(activeProducts);
      applyFilters(activeProducts);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      setProducts([]);
      setAllProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (baseProducts = allProducts) => {
    let filteredProducts = [...baseProducts];
    console.log('Aplicando filtros:', filters);

    if (campaignId) {
      filteredProducts = filteredProducts.filter((product: Product) =>
        product.campaign?.id === parseInt(campaignId)
      );
    } else {
      if (filters.gender !== 'all') {
        const genderId = filters.gender === 'masculino' ? 1 : 2;
        filteredProducts = filteredProducts.filter((product: Product) =>
          product.campaign?.gender_id === genderId
        );
      }
    }

    filteredProducts = filteredProducts.filter((product: Product) => {
      const prices = product.colorSizes?.map(cs => cs.price ? parseFloat(cs.price) : product.preco) || [product.preco];
      const minPrice = Math.min(...prices);

      if (filters.priceRange) {
        if (minPrice < filters.priceRange[0] || minPrice > filters.priceRange[1]) {
          return false;
        }
      }

      if (filters.sizes.length > 0) {
        const productSizes = product.colorSizes?.map(cs => cs.size) || [];
        if (!filters.sizes.some(size => productSizes.includes(size))) {
          return false;
        }
      }

      if (filters.colors.length > 0) {
        const productColors = product.productColors?.map(pc => pc.name) || [];
        if (!filters.colors.some(color => productColors.includes(color))) {
          return false;
        }
      }

      return true;
    });

    console.log('Produtos filtrados:', filteredProducts);
    setProducts(filteredProducts);
  };

  const getImagesArray = (images: string[] | string | null): string[] => {
    if (!images) return [];
    if (Array.isArray(images)) return images;
    try {
      return JSON.parse(images);
    } catch {
      return [images];
    }
  };

  const handleCheckout = (product: Product, sizeId: number, quantidade: number, selectedColor: string | null) => {
    console.log('Checkout:', { product, sizeId, quantidade, selectedColor });
  };

  const handleGenderFilter = (gender: string) => {
    setFilters((prev) => ({ ...prev, gender }));
    const newParams = new URLSearchParams();
    if (gender !== 'all') {
      const urlGender = gender === 'masculino' ? 'menino' : 'menina';
      newParams.set('genero', urlGender);
    }
    const newUrl = `/${newParams.toString() ? '?' + newParams.toString() : ''}`;
    navigate(newUrl);
  };

  const calculatePrices = (price: number) => {
    const originalPrice = price;
    const discountedPrice = originalPrice * 2;
    return {
      original: originalPrice,
      discounted: discountedPrice,
      percent: 30,
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value).replace(/\s/g, '\u00A0');
  };

  const getAvailableFilters = () => {
    let maxPrice = 0;
    const sizesSet = new Set<string>();
    const colorsSet = new Set<string>();

    const sourceProducts = campaignId ? products : allProducts;

    sourceProducts.forEach((product) => {
      const prices = product.colorSizes?.map(cs => cs.price ? parseFloat(cs.price) : product.preco) || [product.preco];
      const productMaxPrice = Math.max(...prices);
      if (productMaxPrice > maxPrice) maxPrice = productMaxPrice;

      product.colorSizes?.forEach(cs => sizesSet.add(cs.size));
      product.productColors?.forEach(pc => colorsSet.add(pc.name));
    });

    return {
      availableSizes: Array.from(sizesSet).map(size => ({ id: size, size })),
      availableColors: Array.from(colorsSet),
      maxPrice: Math.ceil(maxPrice),
    };
  };

  const handleApplyFilters = (newFilters: FilterValues) => {
    setFilters(newFilters);
    setFilterModalOpen(false);
  };

  const groupProductsByCampaign = () => {
    const grouped: { [key: number]: Product[] } = {};
    products.forEach((product) => {
      const campaignId = product.campaign?.id;
      if (campaignId) {
        if (!grouped[campaignId]) grouped[campaignId] = [];
        grouped[campaignId].push(product);
      }
    });
    return grouped;
  };

  const groupedProducts = campaignId ? null : groupProductsByCampaign();
  const currentCampaign = campaignId ? campaigns.find(c => c.id === parseInt(campaignId)) : null;
  const genderSubtitle = currentCampaign?.gender_id === 1 ? 'meninos' : 'meninas';

  const handleCampaignClick = (campaignId: number) => {
    navigate(`/campanha/${campaignId}`);
  };

  const { availableSizes, availableColors, maxPrice } = getAvailableFilters();

  return (
    <div className="mx-auto py-8 px-0">
      {campaignId && currentCampaign && (
        <div className="mb-6 text-center">
          <h1
            className="text-2xl font-bold text-primary cursor-pointer hover:underline"
            onClick={() => handleCampaignClick(currentCampaign.id)}
          >
            Campanha {currentCampaign.nome}
          </h1>
          <p
            className="text-sm text-secondary cursor-pointer hover:underline"
            onClick={() => handleCampaignClick(currentCampaign.id)}
          >
            Produtos para <span className="font-medium">{genderSubtitle}</span>
          </p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">Carregando...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          Nenhum produto encontrado para os filtros selecionados.
        </div>
      ) : campaignId ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {products.map((product) => {
            const prices = calculatePrices(product.colorSizes?.[0]?.price ? parseFloat(product.colorSizes[0].price) : product.preco);
            const images = getImagesArray(product.images);
            const isHovered = hoveredProductId === product.id;

            return (
              <div
                key={product.id}
                className="product-item"
                onMouseEnter={() => setHoveredProductId(product.id)}
                onMouseLeave={() => setHoveredProductId(null)}
              >
                <div className="relative">
                  <div className="relative bg-background rounded-t-xl" style={{ paddingTop: '150%' }}>
                    <a
                      href={`/produto/${product.id}`}
                      className="block absolute top-0 left-0 w-full h-full z-5"
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedProduct(product);
                      }}
                    >
                      {images.length > 0 && (
                        <>
                          <img
                            src={`${STORAGE_URL}/api/storage/app/public/${images[0]}`}
                            alt={product.nome}
                            title={product.nome}
                            className={`absolute top-0 left-0 w-full h-full object-contain transition-opacity duration-300 ${isHovered ? 'opacity-0' : 'opacity-100'}`}
                          />
                          {images.length > 1 && (
                            <img
                              src={`${STORAGE_URL}/api/storage/app/public/${images[1]}`}
                              alt={product.nome}
                              title={product.nome}
                              className={`absolute top-0 left-0 w-full h-full object-contain transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                            />
                          )}
                        </>
                      )}
                    </a>
                  </div>
                  <a
                    href={`/produto/${product.id}`}
                    className="name hover:underline"
                    title={product.nome}
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedProduct(product);
                    }}
                  >
                    <div className="product-info-wrapper pt-3 px-4">
                      <h3 className="h3 text-sm font-medium uppercase">{product.nome}</h3>
                      <p className="text-sm text-gray-400 mt-1">{product.campaign?.marca || 'Sem marca'}</p>
                      <div className="price-box pricebox-with-old">
                        <div className="prices">
                          <span className="price old-price text-xs text-gray-500 line-through text-secondary">
                            {formatCurrency(prices.discounted)}
                          </span>
                          <span className="price text-base font-medium text-primary">
                            {' '}{formatCurrency(prices.original)}{' '}
                          </span>
                          <button className="text-white mt-2 text-xs bg-primary p-2 rounded-full w-full">
                            Ver produto
                          </button>
                        </div>
                      </div>
                    </div>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-20">
          {Object.entries(groupedProducts || {}).map(([campaignIdStr, campaignProducts]) => {
            const campaignIdNum = parseInt(campaignIdStr);
            const campaign = campaigns.find(c => c.id === campaignIdNum);
            if (!campaign) return null;
            const genderSubtitle = campaign.gender_id === 1 ? 'meninos' : 'meninas';

            return (
              <section key={campaignIdNum} className="campaign-section">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2
                      className="text-lg font-bold text-primary cursor-pointer hover:underline"
                      onClick={() => handleCampaignClick(campaignIdNum)}
                    >
                      Campanha {campaign.nome}
                    </h2>
                    <p
                      className="text-sm text-secondary cursor-pointer hover:underline"
                      onClick={() => handleCampaignClick(campaignIdNum)}
                    >
                      Produtos para <span className="font-medium">{genderSubtitle}</span>
                    </p>
                  </div>
                  <button
                    className="text-primary text-[10px] border-primary border bg-transparent uppercase hover:text-white py-2 px-4 rounded-full"
                    onClick={() => handleCampaignClick(campaignIdNum)}
                  >
                    Ver campanha
                  </button>
                </div>
                <Carousel className="w-full">
                  <CarouselContent>
                    {campaignProducts.map((product) => {
                      const prices = calculatePrices(product.colorSizes?.[0]?.price ? parseFloat(product.colorSizes[0].price) : product.preco);
                      const images = getImagesArray(product.images);
                      const isHovered = hoveredProductId === product.id;

                      return (
                        <CarouselItem
                          key={product.id}
                          className="basis-1/2 sm:basis-1/3 lg:basis-1/4 xl:basis-1/5"
                          onMouseEnter={() => setHoveredProductId(product.id)}
                          onMouseLeave={() => setHoveredProductId(null)}
                        >
                          <div className="product-item">
                            <div className="relative">
                              <div className="relative bg-background rounded-t-xl" style={{ paddingTop: '150%' }}>
                                <a
                                  href={`/produto/${product.id}`}
                                  className="block absolute top-0 left-0 w-full h-full z-5"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setSelectedProduct(product);
                                  }}
                                >
                                  {images.length > 0 && (
                                    <>
                                      <img
                                        src={`${STORAGE_URL}/api/storage/app/public/${images[0]}`}
                                        alt={product.nome}
                                        title={product.nome}
                                        className={`absolute top-0 left-0 w-full h-full object-contain transition-opacity duration-300 ${isHovered ? 'opacity-0' : 'opacity-100'}`}
                                      />
                                      {images.length > 1 && (
                                        <img
                                          src={`${STORAGE_URL}/api/storage/app/public/${images[1]}`}
                                          alt={product.nome}
                                          title={product.nome}
                                          className={`absolute top-0 left-0 w-full h-full object-contain transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                                        />
                                      )}
                                    </>
                                  )}
                                </a>
                              </div>
                              <a
                                href={`/produto/${product.id}`}
                                className="name hover:underline"
                                title={product.nome}
                                onClick={(e) => {
                                  e.preventDefault();
                                  setSelectedProduct(product);
                                }}
                              >
                                <div className="product-info-wrapper pt-3 px-4">
                                  <h3 className="h3 text-sm font-medium uppercase">{product.nome}</h3>
                                  <p className="text-sm text-gray-400 mt-1">{product.campaign?.marca || 'Sem marca'}</p>
                                  <div className="price-box pricebox-with-old">
                                    <div className="prices">
                                      <span className="price old-price text-xs text-gray-500 line-through text-secondary">
                                        {formatCurrency(prices.discounted)}
                                      </span>
                                      <span className="price text-base font-medium text-primary">
                                        {' '}{formatCurrency(prices.original)}{' '}
                                      </span>
                                      <button className="text-white mt-2 text-xs bg-primary p-2 rounded-full w-full">
                                        Ver produto
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </a>
                            </div>
                          </div>
                        </CarouselItem>
                      );
                    })}
                  </CarouselContent>
                  <CarouselPrevious className="left-2" />
                  <CarouselNext className="right-2" />
                </Carousel>
              </section>
            );
          })}
        </div>
      )}

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        onApply={handleApplyFilters}
        onReset={() => setFilters({ priceRange: null, sizes: [], colors: [], gender: 'all' })}
        availableSizes={availableSizes}
        availableColors={availableColors}
        maxPrice={maxPrice}
      />

      <ProductModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={() => {}}
        onCheckout={handleCheckout}
      />
    </div>
  );
};

export default ProductsGrid;