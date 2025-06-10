import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { X } from 'lucide-react';
import ImageGenerator from "../components/imageGenerator";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

interface Order {
    id: number;
    cliente: {
        id: number | null;
        nome: string;
        cpf: string;
        telefone: string;
    };
    observacoes: string;
    notificacoes_enviadas: number;
    produtos: {
        id: number;
        nome: string;
        preco: string;
        quantidade: number;
        tamanho?: string;
        cor?: string;
        status_pagamento: "pendente" | "pago" | "cancelado";
        status_estoque: "pendente" | "chegou";
        processado: boolean;
        images: string[];
    }[];
    created_at: string;
}

const API_URL = "http://localhost:8002/api";
const STORAGE_URL = "http://localhost:8002/api/storage/app/public/";
const WHATSAPP_MESSAGE_MAX_LENGTH = 1900;

const OrderDetailsPage: React.FC = () => {
    const { id } = useParams();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
    const [selectedProductImages, setSelectedProductImages] = useState<string[]>([]);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
    const [whatsappMessage, setWhatsappMessage] = useState<string>("");

    useEffect(() => {
        const fetchOrderDetails = async () => {
            try {
                const response = await axios.get(`${API_URL}/pedidos/${id}`);
                console.log("Dados do pedido:", response.data);
                setOrder(response.data);

                // Calcular o valor total dos itens pendentes
                const totalPending = response.data.produtos
                    .filter((produto: any) => produto.status_pagamento === "pendente")
                    .reduce((sum: number, produto: any) => 
                        sum + (parseFloat(produto.preco) * produto.quantidade), 0);
                
                const formattedTotal = new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                }).format(totalPending);

                // Definir mensagem padrão com o valor total
                setWhatsappMessage(
                    `Seu pagamento para o pedido #${response.data.id} ainda está pendente. ` +
                    `Valor total: ${formattedTotal}.`
                );
            } catch (error) {
                console.error("Erro ao buscar detalhes do pedido:", error);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchOrderDetails();
    }, [id]);

    useEffect(() => {
        const fetchGeneratedImages = async () => {
            try {
                const response = await axios.get(`${API_URL}/imagens-geradas`);
                setGeneratedImages(response.data.map((img: { path: string }) => img.path));
            } catch (error) {
                console.error("Erro ao buscar imagens geradas:", error);
            }
        };

        fetchGeneratedImages();
    }, []);

    const handleStatusChange = async (produtoId: number, field: "status_pagamento" | "status_estoque", value: string) => {
        if (!order) return;

        try {
            await axios.put(`${API_URL}/pedidos/${order.id}/produtos/${produtoId}/status`, { [field]: value });

            setOrder((prevOrder) => {
                if (!prevOrder) return prevOrder;
                return {
                    ...prevOrder,
                    produtos: prevOrder.produtos.map((produto) =>
                        produto.id === produtoId ? { ...produto, [field]: value } : produto
                    ),
                };
            });
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
        }
    };

    const handleGenerateImage = async () => {
        if (!order) return;

        const newProducts = order.produtos.filter(
            (produto) => produto.status_estoque === "chegou" && !produto.processado
        );

        if (newProducts.length === 0) return;

        setIsGeneratingImage(true);
    };

    const handleImageComplete = async (processedIds: number[], imageUrl: string) => {
        try {
            await axios.post(`${API_URL}/marcar-processados`, { produtos: processedIds });

            setOrder((prevOrder) => {
                if (!prevOrder) return prevOrder;
                return {
                    ...prevOrder,
                    produtos: prevOrder.produtos.map((produto) =>
                        processedIds.includes(produto.id) ? { ...produto, processado: true } : produto
                    ),
                };
            });

            const cleanImageUrl = imageUrl.replace(`${STORAGE_URL}`, "");
            setGeneratedImages((prev) => [...prev, cleanImageUrl]);
        } catch (error) {
            console.error("Erro ao processar imagem:", error);
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const handleOpenNotificationModal = () => {
        setIsNotificationModalOpen(true);
    };

    const handleSendNotification = async () => {
        if (!order) return;

        const encodedMessage = encodeURIComponent(whatsappMessage);
        const whatsappUrl = `https://wa.me/${order.cliente.telefone}?text=${encodedMessage}`;
        window.open(whatsappUrl, "_blank");

        try {
            await axios.post(`${API_URL}/notificar-pagamento`, { order_id: order.id });
            setOrder((prevOrder) => {
                if (!prevOrder) return prevOrder;
                return {
                    ...prevOrder,
                    notificacoes_enviadas: prevOrder.notificacoes_enviadas + 1,
                };
            });
            setIsNotificationModalOpen(false);
        } catch (error) {
            console.error("Erro ao registrar notificação:", error);
        }
    };

    const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newMessage = e.target.value;
        if (newMessage.length <= WHATSAPP_MESSAGE_MAX_LENGTH) {
            setWhatsappMessage(newMessage);
        }
    };

    const openFullScreen = (images: string[], index: number) => {
        setSelectedProductImages(images);
        setActiveImageIndex(index);
        setIsFullScreenOpen(true);
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Carregando...</div>;
    }

    if (!order) {
        return <div className="flex justify-center items-center h-screen text-red-500">Pedido não encontrado</div>;
    }

    const produtosElegiveis = order.produtos.some(
        (produto) => produto.status_estoque === "chegou" && !produto.processado
    );
    const hasPendingPayment = order.produtos.some(
        (produto) => produto.status_pagamento === "pendente"
    );

    return (
        <div className="container mx-auto p-4">
            <Card>
                <CardHeader>
                    <CardTitle>Pedido #{order.id}</CardTitle>
                    <CardTitle>Cliente: {order.cliente.nome}</CardTitle>
                    <CardTitle>CPF: {order.cliente.cpf}</CardTitle>
                    <CardTitle>Telefone: {order.cliente.telefone}</CardTitle>
                    <div className="mt-2">
                        <span>
                            {order.notificacoes_enviadas > 1
                                ? `${order.notificacoes_enviadas} notificações enviadas.`
                                : order.notificacoes_enviadas === 1
                                ? "1 notificação enviada."
                                : "Nenhuma notificação foi enviada."}
                        </span>
                        {hasPendingPayment && (
                            <Button
                                className="ml-4"
                                size="sm"
                                onClick={handleOpenNotificationModal}
                            >
                                Enviar Notificação
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID do Produto</TableHead>
                                <TableHead>Nome</TableHead>
                                <TableHead>Preço</TableHead>
                                <TableHead>Quantidade</TableHead>
                                <TableHead>Tamanho</TableHead>
                                <TableHead>Cor</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Pagamento</TableHead>
                                <TableHead>Imagens</TableHead>
                                <TableHead>Estoque</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {order.produtos.map((produto) => (
                                <TableRow key={produto.id}>
                                    <TableCell>{produto.id}</TableCell>
                                    <TableCell>{produto.nome}</TableCell>
                                    <TableCell>
                                        {new Intl.NumberFormat("pt-BR", {
                                            style: "currency",
                                            currency: "BRL",
                                        }).format(parseFloat(produto.preco))}
                                    </TableCell>
                                    <TableCell>{produto.quantidade}</TableCell>
                                    <TableCell>{produto.tamanho ?? '-'}</TableCell>
                                    <TableCell>{produto.cor ?? '-'}</TableCell>
                                    <TableCell>
                                        {new Intl.NumberFormat("pt-BR", {
                                            style: "currency",
                                            currency: "BRL",
                                        }).format(parseFloat(produto.preco) * produto.quantidade)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={produto.status_pagamento === "pago" ? "secondary" : produto.status_pagamento === "cancelado" ? "destructive" : "default"}>
                                            <Select
                                                defaultValue={produto.status_pagamento}
                                                onValueChange={(value) => handleStatusChange(produto.id, "status_pagamento", value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="pendente">Pendente</SelectItem>
                                                    <SelectItem value="pago">Pago</SelectItem>
                                                    <SelectItem value="cancelado">Cancelado</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {produto.images.length > 0 ? (
                                            <img
                                                src={`${STORAGE_URL}${produto.images[0]}`}
                                                alt={`${produto.nome} - Imagem 1`}
                                                className="w-full max-w-[100px] h-[120px] object-cover cursor-pointer rounded-lg"
                                                onClick={() => openFullScreen(produto.images, 0)}
                                            />
                                        ) : (
                                            '-'
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={produto.status_estoque === "chegou" ? "secondary" : "default"}>
                                            <Select
                                                defaultValue={produto.status_estoque}
                                                onValueChange={(value) => handleStatusChange(produto.id, "status_estoque", value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="pendente">Pendente</SelectItem>
                                                    <SelectItem value="chegou">Chegou</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Button
                className="mt-4"
                onClick={handleGenerateImage}
                disabled={!produtosElegiveis}
            >
                Gerar imagem dos produtos que chegaram
            </Button>
            {isGeneratingImage && (
              <ImageGenerator
                  products={order!.produtos.filter((produto) => produto.status_estoque === "chegou" && !produto.processado)}
                  storageUrl={STORAGE_URL}
                  orderId={order!.id} // Passando o orderId
                  onComplete={handleImageComplete}
              />
          )}

            <div className="mt-20">
                <h2 className="text-lg font-semibold">Notificações geradas</h2>
                {generatedImages.length > 0 ? (
                    <div className="grid grid-cols-6 gap-4 mt-4">
                        {generatedImages.map((image, index) => (
                            <div key={index} className="p-2 border rounded">
                                <img src={`${STORAGE_URL}${image}`} alt="Imagem Gerada" className="w-full h-auto" />
                                <a href={`${STORAGE_URL}${image}`} download className="block mt-2 text-blue-500">
                                    Baixar Imagem
                                </a>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p>Nenhuma imagem gerada ainda.</p>
                )}
            </div>

            <Dialog open={isNotificationModalOpen} onOpenChange={setIsNotificationModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Personalizar mensagem de notificação</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Input
                            value={whatsappMessage}
                            onChange={handleMessageChange}
                            placeholder="Digite a mensagem para o WhatsApp"
                            maxLength={WHATSAPP_MESSAGE_MAX_LENGTH}
                        />
                        <div className="text-sm text-gray-500">
                            {whatsappMessage.length}/{WHATSAPP_MESSAGE_MAX_LENGTH} caracteres
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNotificationModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSendNotification}>
                            Enviar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                            {selectedProductImages.map((image, index) => (
                                <CarouselItem key={index}>
                                    <div className="flex items-center justify-center h-screen">
                                        <img
                                            src={`${STORAGE_URL}${image}`}
                                            alt={`Imagem ${index + 1}`}
                                            className="max-w-full max-h-full object-contain"
                                        />
                                        <div className="absolute bottom-8 right-8 bg-black/70 text-white px-3 py-1 rounded-md">
                                            {index + 1} / {selectedProductImages.length}
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
        </div>
    );
};

export default OrderDetailsPage;