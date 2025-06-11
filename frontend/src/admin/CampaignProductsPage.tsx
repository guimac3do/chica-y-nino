import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselPrevious, 
  CarouselNext 
} from "@/components/ui/carousel";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { 
  MoreVertical,
  Calendar as CalendarIcon,
  Building2,
  ShoppingBag,
  LineChart,
  Filter,
  ChevronDown,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast"; // Corrigido para o caminho correto
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import axios from 'axios';
import { format, differenceInDays, isAfter, isBefore, parseISO } from 'date-fns';

interface Campaign {
  id: number;
  nome: string;
  data_inicio: string;
  data_fim: string;
  marca: string;
  gender_id: number;
}

interface Product {
  id: number;
  nome: string;
  preco: string;
  descricao?: string;
  quantidade: number;
  images: string[];
}

interface Filters {
  minPrice: number;
  maxPrice: number;
  minSales: number;
  maxSales: number;
  minOrders: number;
  maxOrders: number;
}

interface ImageViewerProps {
  images: string[];
  initialIndex: number;
  storageUrl: string;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ images, initialIndex, storageUrl }) => {
  return (
    <div className="relative">
      <Carousel className="w-full max-w-3xl mx-auto">
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem key={index}>
              <img 
                src={`${storageUrl}${image}`} 
                alt={`Product image ${index + 1}`}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2" />
        <CarouselNext className="right-2" />
      </Carousel>
    </div>
  );
};

const ITEMS_PER_PAGE = 10;
const API_URL = "http://localhost:8002/api";
const STORAGE_URL = "http://localhost:8002/api/storage/app/public/";

const CampaignProductsPage: React.FC = () => {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [ordersByProduct, setOrdersByProduct] = useState<Record<number, number>>({});
  const [salesByProduct, setSalesByProduct] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedImage, setSelectedImage] = useState<{images: string[], index: number} | null>(null);
  const [filters, setFilters] = useState<Filters>({
    minPrice: 0,
    maxPrice: 1000,
    minSales: 0,
    maxSales: 100,
    minOrders: 0,
    maxOrders: 100
  });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Campaign | null>(null);
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);
  const { toast } = useToast();
  const [showStartDateCalendar, setShowStartDateCalendar] = useState(false); // Novo estado
  const [showEndDateCalendar, setShowEndDateCalendar] = useState(false);     // Novo estado
  

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  };

  const fetchCampaignDetails = async () => {
    setLoading(true);
    try {
      const campaignResponse = await axios.get(`${API_URL}/campanhas/${id}`);
      setCampaign(campaignResponse.data);
      
      const productsResponse = await axios.get(`${API_URL}/campanhas/${id}/produtos`);
      if (Array.isArray(productsResponse.data)) {
        const processedProducts = productsResponse.data.map((product: Product) => ({
          ...product,
          images: typeof product.images === 'string' ? JSON.parse(product.images) : product.images,
        }));
        
        setProducts(processedProducts);
        setFilteredProducts(processedProducts);
        
        const maxPrice = Math.max(...processedProducts.map((p: Product) => parseFloat(p.preco)));
        setFilters(prev => ({
          ...prev,
          maxPrice: Math.ceil(maxPrice)
        }));
      }
    } catch (error) {
      console.error('Error fetching campaign details:', error);
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchCampaignDetails();
  }, [id]);

  useEffect(() => {
    const fetchOrdersData = async () => {
      try {
        const ordersResponse = await axios.get(`${API_URL}/campanhas/${id}/pedidos`);
        setTotalOrders(ordersResponse.data.total_orders);
        setOrdersByProduct(ordersResponse.data.orders_by_product);
  
        const maxOrders = Math.max(...Object.values(ordersResponse.data.orders_by_product), 0);
        setFilters(prev => ({
          ...prev,
          maxOrders: Math.ceil(maxOrders)
        }));
      } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
      }
    };
    if (id) fetchOrdersData();
  }, [id]);
  
  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        const response = await axios.get(`${API_URL}/campanhas/${id}/vendas`);
        setSalesByProduct(response.data);
  
        const maxSales = Math.max(...Object.values(response.data), 0);
        setFilters(prev => ({
          ...prev,
          maxSales: Math.ceil(maxSales)
        }));
      } catch (error) {
        console.error('Erro ao buscar vendas dos produtos:', error);
      }
    };
    if (id) fetchSalesData();
  }, [id]);
  
  useEffect(() => {
    let filtered = products;
  
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  
    filtered = filtered.filter(product => {
      const price = parseFloat(product.preco);
      return price >= filters.minPrice && price <= filters.maxPrice;
    });
  
    filtered = filtered.filter(product => {
      const sales = salesByProduct[product.id] || 0;
      return sales >= filters.minSales && sales <= filters.maxSales;
    });
  
    filtered = filtered.filter(product => {
      const orders = ordersByProduct[product.id] || 0;
      return orders >= filters.minOrders && orders <= filters.maxOrders;
    });
  
    setFilteredProducts(filtered);
  }, [searchTerm, filters, products, salesByProduct, ordersByProduct]);

  const resetFilters = () => {
    const maxSales = Object.values(salesByProduct).length > 0 ? Math.max(...Object.values(salesByProduct)) : 0;
    const maxOrders = Object.values(ordersByProduct).length > 0 ? Math.max(...Object.values(ordersByProduct)) : 0;
  
    setFilters({
      minPrice: 0,
      maxPrice: Math.max(...products.map(p => parseFloat(p.preco))),
      minSales: 0,
      maxSales: maxSales,
      minOrders: 0,
      maxOrders: maxOrders,
    });
  
    setFilteredProducts(products);
    setSearchTerm("");
  };

  const getCampaignStatus = () => {
    if (!campaign || !campaign.data_inicio || !campaign.data_fim) return 'Carregando...';
    const now = new Date();
    const startDate = parseISO(campaign.data_inicio);
    const endDate = parseISO(campaign.data_fim);
    if (isBefore(now, startDate)) return 'Não iniciada';
    if (isAfter(now, endDate)) return 'Finalizada';
    return 'Ativa';
  };

  const calculateCampaignDuration = () => {
    if (!campaign || !campaign.data_inicio || !campaign.data_fim) return '';
    const startDate = parseISO(campaign.data_inicio);
    const endDate = parseISO(campaign.data_fim);
    return differenceInDays(endDate, startDate);
  };

  useEffect(() => {
    if (campaign && editModalOpen && !editForm) {
      setEditForm(campaign);
      setDataInicio(new Date(campaign.data_inicio));
      setDataFim(new Date(campaign.data_fim));
    }
  }, [campaign, editModalOpen]);

  const handleEditCampaign = async () => {
    if (!editForm || !id) return;

    try {
      const updatedCampaign = {
        nome: editForm.nome,
        gender_id: editForm.gender_id,
        marca: editForm.marca,
        data_inicio: dataInicio ? format(dataInicio, 'yyyy-MM-dd') : editForm.data_inicio,
        data_fim: dataFim ? format(dataFim, 'yyyy-MM-dd') : editForm.data_fim,
      };
      console.log('Dados enviados para atualização:', updatedCampaign);

      const response = await axios.put(`${API_URL}/campanhas/${id}`, updatedCampaign);
      setCampaign(response.data);
      setEditModalOpen(false);
      toast({
        title: "Sucesso",
        description: "Campanha atualizada com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao atualizar campanha:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar a campanha.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!campaign) {
    return <div>Campanha não encontrada</div>;
  }

  return (
    <div className="p-6 bg-white">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold">{campaign.nome}</h1>
            <p className="text-sm text-gray-500">Campaign Details and Performance</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                getCampaignStatus() === 'Ativa'
                  ? 'default'
                  : getCampaignStatus() === 'Finalizada'
                  ? 'destructive'
                  : 'outline'
              }
              className="ml-2"
            >
              {getCampaignStatus()}
            </Badge>
            <Button onClick={() => setEditModalOpen(true)}>Editar Campanha</Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Orders</span>
                <div className="bg-[#0A4B3C] text-white p-2 rounded-lg">
                  <ShoppingBag className="h-4 w-4" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold">{totalOrders}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-green-500">
                <LineChart className="h-4 w-4 mr-1" />
                Campaign Performance
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Duration</span>
                <div className="bg-[#0A4B3C] text-white p-2 rounded-lg">
                  <CalendarIcon className="h-4 w-4" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold">{calculateCampaignDuration()}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-500">
                Days total
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Brand</span>
                <div className="bg-[#0A4B3C] text-white p-2 rounded-lg">
                  <Building2 className="h-4 w-4" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold">{campaign.marca}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-500">
                Campaign Brand
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Produtos da campanha - <Badge>{filteredProducts.length} produtos</Badge></CardTitle>
              <p className="text-sm text-gray-500 mt-1">Informações de todos os produtos da campanha.</p>
            </div>
            <div className="flex items-center gap-3">
              <Input 
                placeholder="Search products" 
                className="w-[280px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Popover open={showFilters} onOpenChange={setShowFilters}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <div className="font-medium">Filters</div>
                    
                    <div>
                      <label className="text-sm font-medium">Price Range</label>
                      <div className="mt-2">
                        <Slider
                          min={0}
                          max={filters.maxPrice}
                          step={1}
                          value={[filters.minPrice, filters.maxPrice]}
                          onValueChange={([min, max]) => 
                            setFilters(prev => ({ ...prev, minPrice: min, maxPrice: max }))
                          }
                        />
                        <div className="flex justify-between mt-1 text-sm text-gray-500">
                          <span>R$ {filters.minPrice}</span>
                          <span>R$ {filters.maxPrice}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Sales Range</label>
                      <div className="mt-2">
                        <Slider
                          min={0}
                          max={filters.maxSales}
                          step={1}
                          value={[filters.minSales, filters.maxSales]}
                          onValueChange={([min, max]) => 
                            setFilters(prev => ({ ...prev, minSales: min, maxSales: max }))
                          }
                        />
                        <div className="flex justify-between mt-1 text-sm text-gray-500">
                          <span>{filters.minSales}</span>
                          <span>{filters.maxSales}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Orders Range</label>
                      <div className="mt-2">
                        <Slider
                          min={0}
                          max={filters.maxOrders}
                          step={1}
                          value={[filters.minOrders, filters.maxOrders]}
                          onValueChange={([min, max]) => 
                            setFilters(prev => ({ ...prev, minOrders: min, maxOrders: max }))
                          }
                        />
                        <div className="flex justify-between mt-1 text-sm text-gray-500">
                          <span>{filters.minOrders}</span>
                          <span>{filters.maxOrders}</span>
                        </div>
                      </div>
                    </div>

                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={resetFilters}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reset Filters
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <Button 
                onClick={() => navigate(`/campanha/${id}/pedidos`)}
                className="bg-[#0A4B3C] hover:bg-[#0d5a48]"
              >
                View Orders
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox />
                    </TableHead>
                    <TableHead>Product Details</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Images</TableHead>
                    <TableHead>
                      Sales
                      <ChevronDown className="inline ml-2 h-4 w-4" />
                    </TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(currentProducts) && currentProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Checkbox />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{product.nome}</div>
                          <div className="text-sm text-gray-500">ID: {product.id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(parseFloat(product.preco))}
                      </TableCell>
                      <TableCell>
                        {product.images && product.images.length > 0 ? (
                          <Dialog>
                            <div className="relative">
                              <Carousel className="w-full max-w-[100px]">
                                <CarouselContent>
                                  {product.images.map((imagem, index) => (
                                    <CarouselItem key={index}>
                                      <DialogTrigger asChild>
                                        <img 
                                          src={`${STORAGE_URL}${imagem}`} 
                                          alt={`Product ${product.id}`} 
                                          className="w-full h-20 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                                          onClick={() => setSelectedImage({ images: product.images, index })}
                                        />
                                      </DialogTrigger>
                                    </CarouselItem>
                                  ))}
                                </CarouselContent>
                                <CarouselPrevious />
                                <CarouselNext />
                              </Carousel>
                            </div>
                            <DialogContent className="max-w-4xl">
                              {selectedImage && (
                                <ImageViewer 
                                  images={selectedImage.images} 
                                  initialIndex={selectedImage.index}
                                  storageUrl={STORAGE_URL}
                                />
                              )}
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <p className="text-sm text-gray-500">No images</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="rounded-full">
                          {salesByProduct[product.id] || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default" className="rounded-full">
                          {ordersByProduct[product.id] || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                Exibindo {filteredProducts.length} produtos
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  {getPageNumbers().map((page) => (
                    <Button 
                      key={page} 
                      variant={page === currentPage ? "default" : "ghost"} 
                      size="icon"
                      className="w-8 h-8"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Edição */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
  <DialogContent className="p-0 max-w-xl">
    <Card className="border-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Editar Campanha</CardTitle>
        <Button variant="ghost" size="icon" onClick={() => setEditModalOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {editForm && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da campanha</label>
              <Input 
                className="w-full" 
                placeholder="Nome da campanha" 
                value={editForm.nome}
                onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2 relative">
                <label className="text-sm font-medium">Data Início</label>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  onClick={() => setShowStartDateCalendar(!showStartDateCalendar)}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataInicio ? format(dataInicio, "PPP", { locale: ptBR }) : <span>Selecione a data</span>}
                </Button>
                {showStartDateCalendar && (
                  <div className="absolute z-10 top-full left-0 mt-1 border rounded-md shadow-lg bg-white p-2">
                    <Calendar
                      mode="single"
                      selected={dataInicio}
                      onSelect={(date) => {
                        setDataInicio(date);
                        setShowStartDateCalendar(false); // Fecha o calendário após selecionar
                      }}
                      initialFocus
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2 relative">
                <label className="text-sm font-medium">Data Fim</label>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  onClick={() => setShowEndDateCalendar(!showEndDateCalendar)}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataFim ? format(dataFim, "PPP", { locale: ptBR }) : <span>Selecione a data</span>}
                </Button>
                {showEndDateCalendar && (
                  <div className="absolute z-10 top-full left-0 mt-1 border rounded-md shadow-lg bg-white p-2">
                    <Calendar
                      mode="single"
                      selected={dataFim}
                      onSelect={(date) => {
                        setDataFim(date);
                        setShowEndDateCalendar(false); // Fecha o calendário após selecionar
                      }}
                      initialFocus
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Gênero</label>
                <Select 
                  value={editForm.gender_id.toString()}
                  onValueChange={(value) => setEditForm({ ...editForm, gender_id: parseInt(value, 10) })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione o gênero" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Menino</SelectItem>
                    <SelectItem value="2">Menina</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome da marca</label>
                <Input 
                  className="w-full" 
                  placeholder="Nome da marca" 
                  value={editForm.marca}
                  onChange={(e) => setEditForm({ ...editForm, marca: e.target.value })}
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => setEditModalOpen(false)}>
          Cancelar
        </Button>
        <Button onClick={handleEditCampaign}>Salvar</Button>
      </CardFooter>
    </Card>
  </DialogContent>
</Dialog>
    </div>
  );
};

export default CampaignProductsPage;