import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { Product } from '@/types/product';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const STORAGE_URL = "http://localhost:8002";
const API_URL = "http://localhost:8002/api";

interface ProductViewProps {
  product: Product;
  onAddToCart?: (product: Product, sizeId: number, quantidade: number, selectedColor: string | null) => void;
  onCheckout?: (product: Product, sizeId: number, quantidade: number, selectedColor: string | null) => void;
  onClose?: () => void;
  showBackButton?: boolean;
}

export const ProductView: React.FC<ProductViewProps> = ({
  product,
  onAddToCart,
  onCheckout,
  onClose,
  showBackButton = false,
}) => {
  console.log('Produto recebido no ProductView:', product);

  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [recommendedTitle, setRecommendedTitle] = useState<string>('');
  const { toast } = useToast();
  const { addToCart, setCartOpen } = useCart();
  const { token } = useAuth();
  const navigate = useNavigate();

  const titleOptions = [
    "Produtos Recomendados",
    "Veja Também",
    "Itens Semelhantes",
  ];

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * titleOptions.length);
    setRecommendedTitle(titleOptions[randomIndex]);
  }, [product]);

  useEffect(() => {
    const fetchRecommendedProducts = async () => {
      try {
        const genderId = product.campaign?.gender_id;
        if (!genderId) return;

        const response = await axios.get(`${API_URL}/products`);
        const filteredProducts = response.data
          .filter((p: Product) => p.campaign?.gender_id === genderId && p.id !== product.id)
          .filter((p: Product) => {
            const now = new Date();
            const startDate = new Date(p.campaign.data_inicio);
            const endDate = new Date(p.campaign.data_fim);
            return startDate <= now && endDate >= now;
          });

        const shuffled = filteredProducts.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);
        setRecommendedProducts(selected);
      } catch (error) {
        console.error('Erro ao buscar produtos recomendados:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar produtos recomendados.",
          variant: "destructive",
        });
      }
    };

    fetchRecommendedProducts();
  }, [product, toast]);

  const getAllImages = () => {
    const generalImages = Array.isArray(product.images) ? product.images : [];
    const colorImages = product.colorImages?.map(img => img.image_path) || [];
    const allImages = [...generalImages, ...colorImages];
    console.log('Todas as imagens disponíveis:', allImages);
    return allImages;
  };

  const getFilteredImages = () => {
    const allImages = getAllImages();
    if (!selectedColorId && !selectedSize) {
      return allImages;
    }

    const filteredColorImages = selectedColorId
      ? product.colorImages?.filter(img => img.product_color_id === selectedColorId).map(img => img.image_path) || []
      : product.colorImages?.map(img => img.image_path) || [];

    const result = filteredColorImages.length > 0 ? filteredColorImages : (Array.isArray(product.images) ? product.images : []);
    console.log('Imagens filtradas:', result);
    return result;
  };

  const getAvailableSizes = () => {
    const sizes = [...new Set(product.colorSizes?.map(cs => cs.size) || [])];
    console.log('Tamanhos disponíveis:', sizes);
    return sizes;
  };

  const getAvailableColors = () => {
    const uniqueColorsMap = new Map<number, { id: number; name: string }>();
    product.productColors?.forEach(color => {
      uniqueColorsMap.set(color.id, { id: color.id, name: color.name });
    });
    const colors = Array.from(uniqueColorsMap.values());
    console.log('Cores disponíveis:', colors);
    return colors;
  };

  const isSizeAvailableForColor = (size: string) => {
    if (!selectedColorId) return true;
    const available = product.colorSizes?.some(cs => cs.product_color_id === selectedColorId && cs.size === size);
    console.log(`Tamanho ${size} disponível para cor ${selectedColorId}:`, available);
    return available;
  };

  const isColorAvailableForSize = (colorId: number) => {
    if (!selectedSize) return true;
    const available = product.colorSizes?.some(cs => cs.size === selectedSize && cs.product_color_id === colorId);
    console.log(`Cor ${colorId} disponível para tamanho ${selectedSize}:`, available);
    return available;
  };

  const getUnitPrice = () => {
    if (selectedSize && selectedColorId) {
      const selectedColorSize = product.colorSizes?.find(
        cs => cs.size === selectedSize && cs.product_color_id === selectedColorId
      );
      const price = selectedColorSize?.price ? parseFloat(selectedColorSize.price) : product.preco;
      console.log('Preço unitário selecionado:', price);
      return price;
    }
    const prices = product.colorSizes?.map(cs => cs.price ? parseFloat(cs.price) : product.preco) || [product.preco];
    const minPrice = Math.min(...prices);
    console.log('Preço unitário mínimo:', minPrice);
    return minPrice;
  };

  const handleAddToCart = async () => {
    if (!selectedSize) {
      toast({ title: "Erro", description: "Por favor, selecione um tamanho.", variant: "destructive" });
      return;
    }
    if (!selectedColorId && product.productColors?.length > 0) {
      toast({ title: "Erro", description: "Por favor, selecione uma cor.", variant: "destructive" });
      return;
    }

    try {
      const selectedColorSize = product.colorSizes?.find(cs => cs.size === selectedSize && cs.product_color_id === selectedColorId);
      const colorName = getAvailableColors().find(c => c.id === selectedColorId)?.name || null;
      const price = selectedColorSize?.price ? parseFloat(selectedColorSize.price) : product.preco;

      await addToCart({
        product_id: product.id,
        product_size_id: selectedColorSize?.id || 0,
        nome: product.nome,
        size: selectedSize,
        price: price.toString(),
        quantidade,
        cor: colorName,
        color_image: product.colorImages?.find(img => img.product_color_id === selectedColorId)?.image_path || null,
        images: product.images,
      });

      toast({
        title: "Sucesso",
        description: "Produto adicionado ao carrinho!",
        duration: 3000,
        action: <ToastAction altText="Ver Carrinho" onClick={() => setCartOpen(true)}>Ver Carrinho</ToastAction>,
      });
      if (onAddToCart) onAddToCart(product, selectedColorSize?.id || 0, quantidade, colorName);
      setQuantidade(1);
      setSelectedSize(null);
      setSelectedColorId(null);
    } catch (error) {
      console.error('Erro ao adicionar ao carrinho:', error);
      toast({
        title: "Erro",
        description: "Falha ao adicionar ao carrinho: " + (error.response?.data?.message || error.message),
        variant: "destructive",
      });
    }
  };

  const handleCheckout = async () => {
    if (!selectedSize) {
      toast({ title: "Erro", description: "Por favor, selecione um tamanho.", variant: "destructive" });
      return;
    }
    if (!selectedColorId && getAvailableColors().length > 0) {
      toast({ title: "Erro", description: "Por favor, selecione uma cor.", variant: "destructive" });
      return;
    }
    if (!token) {
      toast({ title: "Erro", description: "Você precisa estar autenticado.", variant: "destructive" });
      return;
    }

    try {
      const selectedColorSize = product.colorSizes?.find(cs => cs.size === selectedSize && cs.product_color_id === selectedColorId);
      const response = await axios.post(
        `${API_URL}/orders`,
        {
          items: [{
            product_id: product.id,
            product_size_id: selectedColorSize?.id || 0,
            quantidade,
            cor: getAvailableColors().find(c => c.id === selectedColorId)?.name || null,
          }],
          observacoes: "Nenhuma.",
          telefone: "123456789",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: "Sucesso", description: `Pedido #${response.data.order_id} criado!`, duration: 3000 });
      if (onCheckout) onCheckout(product, selectedColorSize?.id || 0, quantidade, selectedColorId?.toString() || null);
      if (onClose) onClose();
      navigate(`/pedido/${response.data.order_id}`);
    } catch (error) {
      console.error('Erro ao realizar pedido:', error.response?.data || error.message);
      toast({
        title: "Erro",
        description: "Falha ao realizar o pedido: " + (error.response?.data?.message || error.message),
        variant: "destructive",
      });
    }
  };

  const incrementQuantidade = () => setQuantidade(prev => prev + 1);
  const decrementQuantidade = () => setQuantidade(prev => (prev > 1 ? prev - 1 : 1));

  const images = getFilteredImages();
  const availableSizes = getAvailableSizes();
  const availableColors = getAvailableColors();
  const unitPrice = getUnitPrice();
  const totalPrice = unitPrice * quantidade;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-[-40px]">
        <div className="product-gallery">
          {images.length > 0 ? (
            <>
              <Carousel className="w-full mb-4">
                <CarouselContent>
                  {images.map((image, index) => (
                    <CarouselItem key={index} className={cn(index === activeImageIndex ? "block" : "hidden")}>
                      <div className="relative group">
                        <img
                          src={`${STORAGE_URL}/api/storage/app/public/${image}`}
                          alt={`${product.nome} - ${index + 1}`}
                          className="w-full h-[500px] object-contain cursor-pointer rounded-b-lg bg-background"
                          onClick={() => setIsFullScreenOpen(true)}
                        />
                        <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded-md text-xs">
                          {index + 1} / {images.length}
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-1" />
                <CarouselNext className="right-1" />
              </Carousel>

              <Carousel className="w-full px-4">
                <CarouselContent className="flex space-x-2">
                  {images.map((image, index) => (
                    <CarouselItem key={index} className="basis-1/4 md:basis-1/5 lg:basis-1/6">
                      <img
                        src={`${STORAGE_URL}/api/storage/app/public/${image}`}
                        alt={`Thumbnail ${index + 1}`}
                        className={cn(
                          "w-full h-24 object-cover cursor-pointer border rounded hover:border-primary",
                          index === activeImageIndex && "border-primary border-2"
                        )}
                        onClick={() => setActiveImageIndex(index)}
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-1" />
                <CarouselNext className="right-1" />
              </Carousel>
            </>
          ) : (
            <p className="text-gray-500">Nenhuma imagem disponível.</p>
          )}
        </div>

        <div className="product-info space-y-4 px-6">
          <h1 className="text-2xl font-bold uppercase text-gray-800">{product.nome}</h1>
          <p className="text-md text-gray-400">Marca: {product.campaign?.marca || 'Sem marca'}</p>

          <div className="price-box flex items-center gap-2">
            <div className="text-2xl font-bold text-primary">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPrice)}
            </div>
          </div>

          {availableColors.length > 0 && (
            <div className="colors-selection">
              <h3 className="font-medium text-base mb-2 text-gray-700">Cores</h3>
              <div className="flex flex-wrap gap-2 mt-1">
                {availableColors.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => {
                      if (isColorAvailableForSize(color.id)) setSelectedColorId(color.id);
                    }}
                    disabled={!isColorAvailableForSize(color.id)}
                    className={cn(
                      "px-3 py-1 rounded-full border capitalize relative",
                      selectedColorId === color.id
                        ? "bg-primary text-white border-primary"
                        : "text-gray-700 border-gray-300 hover:bg-gray-100",
                      !isColorAvailableForSize(color.id) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {color.name}
                    {!isColorAvailableForSize(color.id) && (
                      <X className="absolute top-0 right-0 w-4 h-4 text-red-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {availableSizes.length > 0 && (
            <div className="sizes-selection">
              <h3 className="font-medium text-base mb-2 text-gray-700">Tamanho</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {availableSizes.map((size) => (
                  <Button
                    key={size}
                    variant={selectedSize === size ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (isSizeAvailableForColor(size)) setSelectedSize(size);
                    }}
                    disabled={!isSizeAvailableForColor(size)}
                    className={cn(
                      "rounded-full min-w-[3rem] uppercase relative",
                      selectedSize === size && "bg-primary text-white hover:bg-primary/90",
                      !isSizeAvailableForColor(size) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {size}
                    {!isSizeAvailableForColor(size) && (
                      <X className="absolute top-0 right-0 w-4 h-4 text-red-500" />
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="quantity-selector">
            <h3 className="font-medium text-base mb-2 text-gray-700">Quantidade</h3>
            <div className="flex items-center border rounded-md w-fit">
              <Button
                variant="ghost"
                size="sm"
                onClick={decrementQuantidade}
                disabled={quantidade <= 1}
                className="h-10 px-3"
              >
                -
              </Button>
              <span className="w-10 text-center">{quantidade}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={incrementQuantidade}
                className="h-10 px-3"
              >
                +
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-6">
            <Button onClick={handleAddToCart} className="bg-primary text-white py-6 text-base font-bold">
              Adicionar à sacola
            </Button>
            <Button variant="outline" onClick={handleCheckout} className="py-6 text-base font-bold border-primary text-primary">
              Realizar Pedido
            </Button>
            {showBackButton && (
              <Button variant="ghost" onClick={() => window.history.back()} className="mt-2">
                Voltar
              </Button>
            )}
          </div>

          <div className="product-details mt-8 border-t pt-4">
            <h3 className="font-bold text-sm text-gray-700 border-b-2 border-primary pb-2">Descrição</h3>
            <p className="text-sm py-4">{product.descricao || 'Sem descrição'}</p>
          </div>

          {recommendedProducts.length > 0 && (
            <div className="recommended-products mt-8 border-t pt-4">
              <h3 className="font-bold text-sm text-gray-700 border-b-2 border-primary pb-2">{recommendedTitle}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                {recommendedProducts.map((recProduct) => (
                  <div key={recProduct.id} className="recommended-product">
                    <a
                      href={`/produto/${recProduct.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(`/produto/${recProduct.id}`);
                        if (onClose) onClose();
                      }}
                      className="block"
                    >
                      <img
                        src={`${STORAGE_URL}/api/storage/app/public/${recProduct.images?.[0] || ''}`}
                        alt={recProduct.nome}
                        className="w-full h-40 object-contain rounded-t-lg bg-background"
                      />
                      <div className="p-2">
                        <h4 className="text-sm font-medium uppercase text-gray-800">{recProduct.nome}</h4>
                        <p className="text-xs text-gray-400">{recProduct.campaign?.marca || 'Sem marca'}</p>
                        <p className="text-sm font-bold text-primary mt-1">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(recProduct.preco)}
                        </p>
                      </div>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {isFullScreenOpen && (
        <div className="fixed inset-0 h-screen z-50 bg-black bg-opacity-90 flex items-center justify-center">
          <Button
            variant="ghost"
            className="absolute top-4 right-4 text-white bg-gray-800 rounded-full hover:bg-gray-800 z-50"
            onClick={() => setIsFullScreenOpen(false)}
          >
            <X className="w-6 h-6" /> Voltar
          </Button>
          <Carousel className="w-full max-w-5xl">
            <CarouselContent>
              {images.map((image, index) => (
                <CarouselItem key={index}>
                  <div className="flex items-center justify-center h-screen">
                    <img
                      src={`${STORAGE_URL}/api/storage/app/public/${image}`}
                      alt={`${product.nome} - ${index + 1}`}
                      className="max-w-full max-h-full object-contain"
                    />
                    <div className="absolute bottom-8 right-8 bg-black/70 text-white px-3 py-1 rounded-md">
                      {index + 1} / {images.length}
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
          </Carousel>
        </div>
      )}
    </>
  );
};