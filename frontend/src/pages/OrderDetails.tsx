import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, Download, Trash2, X } from 'lucide-react';
import Header from '@/components/HeaderStore';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Footer from "@/components/FooterStore"

const API_URL = "http://localhost:8002/api";
const STORAGE_URL = "http://localhost:8002";

interface Order {
  id: number;
  id_cliente: number;
  telefone: string;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  total: number;
  status_pagamento: string;
  items: OrderItem[];
}

interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  product_size: string;
  quantidade: number;
  cor: string | null;
  status_pagamento: string;
  status_estoque: string;
  notificacoes_enviadas: number;
  is_processed: boolean;
  processed_at: string | null;
  thumbnail: string | null;
  images: string[] | string | null;
  price?: number;
  color_image?: string | null; // Adiciona a imagem da cor
}

const OrderDetailsPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState<number | null>(null);
  const [isCancelOrderModalOpen, setIsCancelOrderModalOpen] = useState(false);
  const [isCancelItemModalOpen, setIsCancelItemModalOpen] = useState<number | null>(null);
  const [orderItemsOpen, setOrderItemsOpen] = useState(true);
  const [orderSummaryOpen, setOrderSummaryOpen] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const isAuthenticated = !!user;

  useEffect(() => {
    const fetchOrder = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        const orderResponse = await axios.get(`${API_URL}/orders-user/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrder(orderResponse.data);
      } catch (error) {
        console.error("Erro ao buscar dados:", error.response?.data || error.message);
        toast({
          title: "Erro",
          description: "Falha ao carregar dados: " + (error.response?.data?.message || error.message),
          variant: "destructive",
        });
        if (error.response?.status === 401) {
          navigate('/');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId, toast, isAuthenticated, token, navigate]);

  const handleCancelOrder = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Erro",
        description: "Você precisa estar autenticado para cancelar o pedido.",
        variant: "destructive",
      });
      return;
    }
    try {
      await axios.post(
        `${API_URL}/orders/${orderId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({
        title: "Sucesso",
        description: "Pedido cancelado com sucesso!",
      });
      setOrder(prev => prev ? { ...prev, status_pagamento: 'cancelado', items: prev.items.map(item => ({ ...item, status_pagamento: 'cancelado' })) } : null);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao cancelar pedido: " + (error.response?.data?.message || error.message),
        variant: "destructive",
      });
    }
  };

  const handleCancelItem = async (itemId: number) => {
    if (!isAuthenticated) {
      toast({
        title: "Erro",
        description: "Você precisa estar autenticado para cancelar um item.",
        variant: "destructive",
      });
      return;
    }
    try {
      await axios.post(
        `${API_URL}/orders/${orderId}/items/${itemId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({
        title: "Sucesso",
        description: "Produto cancelado com sucesso!",
      });
      setOrder(prev => {
        if (!prev || !prev.items) return null;
        const updatedItems = prev.items.map(item =>
          item.id === itemId ? { ...item, status_pagamento: 'cancelado' } : item
        );
        return { ...prev, items: updatedItems };
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao cancelar item: " + (error.response?.data?.message || error.message),
        variant: "destructive",
      });
    }
  };

  const confirmCancelOrder = () => {
    setIsCancelOrderModalOpen(false);
    handleCancelOrder();
  };

  const confirmCancelItem = (itemId: number) => {
    setIsCancelItemModalOpen(null);
    handleCancelItem(itemId);
  };

  const getImagesArray = (images: string[] | string | null): string[] => {
    if (!images) return [];
    if (Array.isArray(images)) return images;
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed : [images];
    } catch {
      return [images];
    }
  };

  const handleCloseFullScreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFullScreenOpen(null);
  };

  const handleModalClose = () => {
    if (!isAuthenticated) {
      // Não faz nada ao clicar fora, mantém o modal de autenticação aberto
    }
  };

  if (loading) return <div className="text-center">Carregando...</div>;

  const isOwner = isAuthenticated && user && order?.id_cliente === user.id;
  const fullScreenItem = order?.items.find(item => item.id === isFullScreenOpen);

  // Get status badges
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pago':
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Pago</Badge>;
      case 'enviado':
      case 'shipped':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Enviado</Badge>;
      case 'cancelado':
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Cancelado</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">{status}</Badge>;
    }
  };

  return (
    <>
      <Header />
      <div>
        {!isAuthenticated && <AuthModal isOpen={!isAuthenticated} onClose={handleModalClose} />}
        {isAuthenticated && order ? (
          <div className="max-w-3xl mx-auto p-4 bg-white rounded-lg py-10 sm:pt-[150px] pt-[100px]">
            {/* Order Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-800 text-primary mb-2 flex items-center"><img className='w-10 mr-2' src="../src/assets/check.svg" />Pedido realizado com sucesso!</h1>
                </div>
                <p className="text-sm text-gray-500"><span className='mr-1 font-medium'>ID: #{order.id}</span></p>

                <p className="text-sm text-gray-500"><span className='mr-1 font-medium'>Data do pedido:</span>
                  {new Date(order.created_at).toLocaleDateString('pt-BR', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            {/* Order Items */}
            <div className="border rounded-lg mb-4 overflow-hidden">
              <div
                className="flex justify-between items-center p-4 bg-gray-50 cursor-pointer"
                onClick={() => setOrderItemsOpen(!orderItemsOpen)}
              >
                <h2 className="font-medium text-gray-800">Itens do pedido</h2>
                <ChevronDown className={`h-5 w-5 transition-transform ${orderItemsOpen ? "" : "-rotate-90"}`} />
              </div>

              {orderItemsOpen && order.items && order.items.length > 0 && (
                <div className="divide-y">
                  {order.items.map((item) => {
  const images = getImagesArray(item.images);
  const imageUrl = item.color_image 
    ? `${STORAGE_URL}/api/storage/app/public/${item.color_image}`
    : (images.length > 0 
        ? `${STORAGE_URL}/api/storage/app/public/${images[0]}`
        : "/placeholder.svg?height=80&width=40");
  const itemPrice = item.price !== undefined ? item.price : (order.total / order.items.length) / item.quantidade;

  return (
    <div className="p-4" key={item.id}>
      <div className="flex justify-between mb-2">
        <div className="flex gap-3">
          <div className="relative">
            <div 
              className="h-20 w-10 cursor-pointer"
              onClick={() => setIsFullScreenOpen(item.id)}
            >
              <img
                src={imageUrl}
                alt={item.product_name}
                className="h-20 w-10 object-cover border rounded"
              />
            </div>
          </div>
          <div>
            <h3 className="font-medium">{item.product_name}</h3>
            <p className="text-sm text-gray-500">Tamanho: {item.product_size}</p>
            <div className="flex gap-4 mt-1">
              <span className="text-xs text-gray-500">Quantidade: {item.quantidade}</span>
              {item.cor && (
                <span className="text-xs text-gray-500 flex items-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-gray-500 mr-1"></span>
                  {item.cor}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="text-right">
            <p className="text-sm">{item.quantidade} × {itemPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            <p className="font-medium">{(itemPrice * item.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>
          {isOwner && item.status_pagamento !== 'cancelado' && (
            <Button variant="ghost" size="icon" className="text-red-500 h-6 w-6" onClick={() => setIsCancelItemModalOpen(item.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
})}
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="border rounded-lg">
              <div
                className="flex justify-between items-center p-4 bg-gray-50 cursor-pointer"
                onClick={() => setOrderSummaryOpen(!orderSummaryOpen)}
              >
                <div className="flex items-center gap-2">
                  <h2 className="font-medium text-gray-800">Resumo do pedido</h2>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${orderSummaryOpen ? "" : "-rotate-90"}`} />
              </div>

              {orderSummaryOpen && (
                <div className="p-4">
                  <div className="space-y-2">

                    {/* Add discount if available */}
                    {order.observacoes && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 text-sm">Observações</span>
                        <div className="flex items-center gap-8">
                          <span className="text-gray-500 text-right text-sm">{order.observacoes}</span>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm">Telefone</span>
                      <div className="flex items-center gap-8">
                        <span className="text-gray-500 text-sm">{order.telefone}</span>
                      </div>
                    </div>
                    <div className="flex justify-between pt-2 border-t mt-2 pr-5">
                      <span className="font-medium text-gray-800">Total</span>
                      <span className="font-bold text-lg w-20 text-right">
                        {order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : isAuthenticated && !order ? (
          <div className="text-center">Pedido não encontrado ou erro ao carregar</div>
        ) : null}
      </div>

      {/* Modal de Confirmação para Cancelar Pedido */}
      <Dialog open={isCancelOrderModalOpen} onOpenChange={setIsCancelOrderModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirme o cancelamento!</DialogTitle>
          </DialogHeader>
          <p>Tem certeza de que deseja cancelar o pedido #{order?.id}?</p>
          <p className='text-sm mt-2 text-gray-500'>* Essa ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelOrderModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmCancelOrder}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação para Cancelar Item */}
      <Dialog open={!!isCancelItemModalOpen} onOpenChange={() => setIsCancelItemModalOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar o cancelamento!</DialogTitle>
          </DialogHeader>
          <p>Tem certeza de que deseja cancelar este produto?</p>
          <p className='text-sm mt-2 text-gray-500'>* Essa ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelItemModalOpen(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => confirmCancelItem(isCancelItemModalOpen!)}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Carrossel em tela cheia */}
      {isFullScreenOpen && fullScreenItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-75"
            onClick={handleCloseFullScreen}
          />
          <div className="relative z-10 w-full max-w-4xl">
            <Button
              variant="secondary"
              className="absolute top-4 right-4 z-20"
              onClick={handleCloseFullScreen}
            >
              <X className="w-6 h-6" />
            </Button>
            <Carousel className="w-full">
              <CarouselContent>
                {getImagesArray(fullScreenItem.images).map((image, index) => (
                  <CarouselItem key={index}>
                    <div className="flex items-center justify-center w-full h-full p-4">
                      <img
                        src={`${STORAGE_URL}/api/storage/app/public/${image}`}
                        alt={`${fullScreenItem.product_name} - ${index + 1}`}
                        className="max-w-full max-h-[80vh] object-contain"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-4" />
              <CarouselNext className="right-4" />
            </Carousel>
          </div>
        </div>
      )}
      <Footer />
    </>
  );
};

export default OrderDetailsPage;