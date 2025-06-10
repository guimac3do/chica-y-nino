import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { X, Plus, MoreVertical } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

type Size = {
  id?: number;
  size: string;
  price?: string | number;
  product_color_id?: number | null;
  color_name?: string;
};

type ProductColorImage = {
  product_color_id: number;
  image_path: string;
};

type Product = {
  id: number;
  nome: string;
  descricao?: string;
  campaign: { nome: string; marca: string | null } | null;
  preco: string | number;
  colors: string[];
  color_sizes: Size[];
  sales?: number;
  images: string[] | string;
  color_images: ProductColorImage[];
  product_colors: { id: number; name: string }[];
};

type FlatProduct = {
  id: number;
  nome: string;
  campaignNome: string;
  campaignMarca: string | null;
  colors: string[];
  size: string;
  price: string | number;
  sales: number;
  images: string[];
  colorImages: ProductColorImage[];
};

type Campaign = {
  id: number;
  nome: string;
  marca: string | null;
};

type Color = {
  id: number;
  name: string;
};

export default function ProductTable() {
  const [products, setProducts] = useState<FlatProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<FlatProduct[]>([]);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [selectedProductImages, setSelectedProductImages] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [campaignFilter, setCampaignFilter] = useState<string | undefined>(undefined);
  const [sizeFilter, setSizeFilter] = useState<string | undefined>(undefined);
  const [colorFilter, setColorFilter] = useState<string | undefined>(undefined);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [campaignOptions, setCampaignOptions] = useState<string[]>([]);
  const [sizeOptions, setSizeOptions] = useState<string[]>([]);
  const [colorOptions, setColorOptions] = useState<string[]>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<FlatProduct | null>(null);
  const [editForm, setEditForm] = useState<Product | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const { toast } = useToast();
  const [colorInput, setColorInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    axios.get("http://localhost:8002/api/products/all").then((response) => {
      console.log("API Response (products):", response.data);

      const flatProducts: FlatProduct[] = response.data.flatMap((product: Product) => {
        const images = typeof product.images === "string" ? JSON.parse(product.images) : product.images || [];
        const colorImages = product.color_images || [];

        if (!product.color_sizes || product.color_sizes.length === 0) {
          return [{
            id: product.id,
            nome: product.nome,
            campaignNome: product.campaign?.nome || "N/A",
            campaignMarca: product.campaign?.marca || "N/A",
            colors: product.colors || [],
            size: "N/A",
            price: product.preco,
            sales: product.sales ?? 0,
            images,
            colorImages,
          }];
        }

        return product.color_sizes.map((size: Size) => ({
          id: product.id,
          nome: product.nome,
          campaignNome: product.campaign?.nome || "N/A",
          campaignMarca: product.campaign?.marca || "N/A",
          colors: product.colors || [],
          size: size.size,
          price: size.price ?? product.preco,
          sales: product.sales ?? 0,
          images,
          colorImages,
        }));
      });

      setProducts(flatProducts);
      setFilteredProducts(flatProducts);

      const uniqueCampaigns = [...new Set(flatProducts.map(p => p.campaignNome))].filter(c => c !== "N/A");
      const uniqueSizes = [...new Set(flatProducts.map(p => p.size))].filter(s => s !== "N/A");
      const uniqueColors = [...new Set(flatProducts.flatMap(p => p.colors))];
      setCampaignOptions(uniqueCampaigns);
      setSizeOptions(uniqueSizes);
      setColorOptions(uniqueColors);
    }).catch((error) => {
      console.error("Erro ao buscar produtos:", error);
    });

    axios.get("http://localhost:8002/api/campanhas").then((response) => {
      setCampaigns(response.data);
    }).catch((error) => {
      console.error("Erro ao buscar campanhas:", error);
    });

    axios.get("http://localhost:8002/api/product-colors").then((response) => {
      setColors(response.data);
    }).catch((error) => {
      console.error("Erro ao buscar cores:", error);
    });
  }, []);

  useEffect(() => {
    let filtered = [...products];

    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.id.toString().includes(searchQuery)
      );
    }

    if (campaignFilter) {
      filtered = filtered.filter(product => product.campaignNome === campaignFilter);
    }

    if (sizeFilter) {
      filtered = filtered.filter(product => product.size === sizeFilter);
    }

    if (colorFilter) {
      filtered = filtered.filter(product => product.colors.includes(colorFilter));
    }

    const min = minPrice ? parseFloat(minPrice) : -Infinity;
    const max = maxPrice ? parseFloat(maxPrice) : Infinity;
    if (minPrice || maxPrice) {
      filtered = filtered.filter(product => {
        const price = typeof product.price === "string" ? parseFloat(product.price) : product.price;
        return price >= min && price <= max;
      });
    }

    setFilteredProducts(filtered);
  }, [searchQuery, campaignFilter, sizeFilter, colorFilter, minPrice, maxPrice, products]);

  const openFullScreen = (product: FlatProduct, index: number) => {
    const allImages = [...product.images, ...product.colorImages.map(ci => ci.image_path)];
    setSelectedProductImages(allImages);
    setActiveImageIndex(index);
    setIsFullScreenOpen(true);
  };

  const openEditModal = async (product: FlatProduct) => {
    try {
      const response = await axios.get(`http://localhost:8002/api/products/all/${product.id}`);
      console.log("Resposta completa da API:", response.data);

      const fullProduct = response.data.product || response.data;
      if (!fullProduct || !fullProduct.id) {
        throw new Error("Dados do produto não encontrados na resposta da API.");
      }

      console.log("Full Product Data:", fullProduct);

      const sizes = fullProduct.color_sizes || [];

      setSelectedProduct(product);
      setEditForm({
        id: fullProduct.id,
        nome: fullProduct.nome,
        descricao: fullProduct.descricao || "",
        campaign: { nome: fullProduct.campaign?.nome || "N/A", marca: fullProduct.campaign?.marca || null },
        preco: fullProduct.preco,
        colors: fullProduct.colors || [],
        color_sizes: sizes.map((size: any) => ({
          id: size.id,
          size: size.size,
          price: size.price,
          product_color_id: size.product_color_id || null,
          color_name: fullProduct.product_colors?.find((c: any) => c.id === size.product_color_id)?.name || null,
        })),
        images: fullProduct.images || [],
        color_images: fullProduct.color_images || [],
        product_colors: fullProduct.product_colors || [], // Garantir que seja sempre um array
      });
      setEditModalOpen(true);
    } catch (error) {
      console.error("Erro ao buscar dados do produto:", error.message || error);
      toast({
        title: "Erro",
        description: "Falha ao carregar os dados do produto: " + (error.message || "Erro desconhecido"),
        variant: "destructive",
      });
    }
  };

  const openDeleteModal = (product: FlatProduct) => {
    setSelectedProduct(product);
    setDeleteModalOpen(true);
  };

  const handleEditProduct = async () => {
    if (!editForm || !selectedProduct) return;

    const formData = new FormData();
    formData.append('nome', editForm.nome || "");
    formData.append('descricao', editForm.descricao || "");
    formData.append('campaign_id', campaigns.find(c => c.nome === editForm.campaign?.nome)?.id.toString() || "");
    formData.append('preco', editForm.preco.toString());
    formData.append('_method', 'PUT');

    editForm.colors.forEach((color, index) => {
      formData.append(`colors[${index}]`, color);
    });

    console.log("Tamanhos no editForm antes de enviar:", editForm.color_sizes);
    editForm.color_sizes?.forEach((size, index) => {
      if (size.id) formData.append(`sizes[${index}][id]`, size.id.toString());
      formData.append(`sizes[${index}][size]`, size.size || "");
      formData.append(`sizes[${index}][price]`, size.price?.toString() || editForm.preco.toString());
      if (size.product_color_id && size.product_color_id > 0) {
        formData.append(`sizes[${index}][product_color_id]`, size.product_color_id.toString());
      } else if (size.color_name) {
        formData.append(`sizes[${index}][color_name]`, size.color_name);
      }
    });

    const existingImages = editForm.images.filter(img => typeof img === 'string') as string[];
    existingImages.forEach((image, index) => {
      formData.append(`existing_images[${index}]`, image);
    });

    const newImages = editForm.images.filter(img => img instanceof File) as File[];
    newImages.forEach((image) => {
      formData.append('images[]', image);
    });

    const existingColorImages = editForm.color_images?.filter(ci => typeof ci.image_path === 'string') || [];
    existingColorImages.forEach((ci, index) => {
      formData.append(`existing_color_images[${index}]`, ci.image_path);
    });

    const newColorImages = editForm.color_images?.filter(ci => ci.image_path instanceof File) || [];
    newColorImages.forEach((ci, index) => {
      formData.append(`color_images[${index}][color_id]`, ci.product_color_id.toString());
      formData.append(`color_images[${index}][images][]`, ci.image_path as File);
    });

    console.log("Dados enviados para o backend:");
    for (const [key, value] of formData.entries()) {
      console.log(`${key}: ${value instanceof File ? '[File]' : value}`);
    }

    try {
      const response = await axios.post(`http://localhost:8002/api/products/${selectedProduct.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log("Resposta completa do backend:", JSON.stringify(response.data, null, 2));

      const updatedProduct = response.data.product;
      if (!updatedProduct) {
        throw new Error("Nenhum produto retornado na resposta do backend.");
      }

      const sizes = updatedProduct.sizes || [];
      const flatUpdatedProducts = sizes.length
        ? sizes.map((size: Size) => ({
            id: updatedProduct.id,
            nome: updatedProduct.nome,
            campaignNome: updatedProduct.campaign?.nome || "N/A",
            campaignMarca: updatedProduct.campaign?.marca || "N/A",
            colors: updatedProduct.colors || [],
            size: size.size,
            price: size.price ?? updatedProduct.preco,
            sales: updatedProduct.sales ?? 0,
            images: updatedProduct.images || [],
            colorImages: updatedProduct.color_images || [],
          }))
        : [{
            id: updatedProduct.id,
            nome: updatedProduct.nome,
            campaignNome: updatedProduct.campaign?.nome || "N/A",
            campaignMarca: updatedProduct.campaign?.marca || "N/A",
            colors: updatedProduct.colors || [],
            size: "N/A",
            price: updatedProduct.preco,
            sales: updatedProduct.sales ?? 0,
            images: updatedProduct.images || [],
            colorImages: updatedProduct.color_images || [],
          }];

      // Atualizar editForm com os dados retornados
      setEditForm({
        ...editForm,
        color_sizes: sizes.map((size: any) => ({
          id: size.id,
          size: size.size,
          price: size.price,
          product_color_id: size.product_color_id || null,
          color_name: updatedProduct.product_colors?.find((c: any) => c.id === size.product_color_id)?.name || null,
        })),
        images: updatedProduct.images || [],
        color_images: updatedProduct.color_images || [],
        product_colors: updatedProduct.product_colors || [], // Garantir que seja sempre um array
      });

      // Atualizar produtos sem duplicatas
      setProducts(prev => {
        const filtered = prev.filter(p => p.id !== selectedProduct.id); // Remove todas as entradas do produto antigo
        return [...filtered, ...flatUpdatedProducts]; // Adiciona as novas entradas
      });
      setFilteredProducts(prev => {
        const filtered = prev.filter(p => p.id !== selectedProduct.id); // Remove todas as entradas do produto antigo
        return [...filtered, ...flatUpdatedProducts]; // Adiciona as novas entradas
      });

      setEditModalOpen(false);
      toast({ title: "Sucesso", description: "Produto atualizado com sucesso!" });
    } catch (error) {
      console.error("Erro ao atualizar produto:", error.response?.data || error.message);
      toast({
        title: "Erro",
        description: "Falha ao atualizar o produto: " + (error.response?.data?.message || error.message),
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;

    try {
      await axios.delete(`http://localhost:8002/api/products/${selectedProduct.id}`);
      setProducts(products.filter(p => p.id !== selectedProduct.id));
      setFilteredProducts(filteredProducts.filter(p => p.id !== selectedProduct.id));
      setDeleteModalOpen(false);
      toast({ title: "Sucesso", description: "Produto deletado com sucesso!" });
    } catch (error) {
      console.error("Erro ao deletar produto:", error);
      toast({ title: "Erro", description: "Falha ao deletar o produto.", variant: "destructive" });
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getColorNameOrId = (color: string) => {
    const existingColor = editForm?.product_colors?.find(c => c.name === color);
    return existingColor ? existingColor.id : null;
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 space-y-4">
        <Input
          placeholder="Pesquisar por nome ou ID"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <div className="flex flex-wrap gap-4">
          <div className="w-48">
            <Select value={campaignFilter} onValueChange={setCampaignFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por campanha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={undefined}>Todas</SelectItem>
                {campaignOptions.map((campaign) => (
                  <SelectItem key={campaign} value={campaign}>
                    {campaign}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-48">
            <Select value={sizeFilter} onValueChange={setSizeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por tamanho" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={undefined}>Todos</SelectItem>
                {sizeOptions.map((size) => (
                  <SelectItem key={size} value={size}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-48">
            <Select value={colorFilter} onValueChange={setColorFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por cor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={undefined}>Todas</SelectItem>
                {colorOptions.map((color) => (
                  <SelectItem key={color} value={color}>
                    {color}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Preço mínimo"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-32"
            />
            <Input
              type="number"
              placeholder="Preço máximo"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-32"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Campanha</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Vendas</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Fotos</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentProducts.map((product, index) => (
                <TableRow key={`${product.id}-${product.size}-${index}`}>
                  <TableCell>{product.id}</TableCell>
                  <TableCell>{product.nome}</TableCell>
                  <TableCell>{product.campaignNome}</TableCell>
                  <TableCell>{product.campaignMarca}</TableCell>
                  <TableCell>{product.colors.length ? product.colors.join(", ") : "N/A"}</TableCell>
                  <TableCell>{product.size}</TableCell>
                  <TableCell>{product.sales}</TableCell>
                  <TableCell>
                    {typeof product.price === "number" || typeof product.price === "string"
                      ? `R$ ${Number(product.price).toFixed(2)}`
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    {product.images.length > 0 || product.colorImages.length > 0 ? (
                      <img
                        src={`http://localhost:8002/api/storage/${product.images[0] || product.colorImages[0]?.image_path}`}
                        alt={`${product.nome} - Imagem 1`}
                        className="w-full max-w-[100px] h-[120px] object-cover cursor-pointer rounded-lg"
                        onClick={() => openFullScreen(product, 0)}
                      />
                    ) : (
                      "Sem imagem"
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditModal(product)}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openDeleteModal(product)} className="text-red-600">
                          Deletar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <div>
            Mostrando {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredProducts.length)} de {filteredProducts.length} produtos
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              Anterior
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {editForm && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Nome*</label>
                  <Input
                    value={editForm.nome}
                    onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                    placeholder="Digite o nome do produto"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <textarea
                    value={editForm.descricao || ""}
                    onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
                    placeholder="Digite a descrição do produto"
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Campanha*</label>
                  <Select
                    value={editForm.campaign?.nome}
                    onValueChange={(value) => setEditForm({ ...editForm, campaign: { nome: value, marca: campaigns.find(c => c.nome === value)?.marca || null } })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma campanha" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.nome}>
                          {campaign.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Preço Base (R$)*</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editForm.preco}
                    onChange={(e) => setEditForm({ ...editForm, preco: parseFloat(e.target.value) || 0 })}
                    placeholder="Digite o preço base"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Cores e Tamanhos*</label>
                  {editForm.colors.map((color, colorIndex) => {
                    const colorId = getColorNameOrId(color);
                    const sizesForColor = editForm.color_sizes.filter(size => 
                      (colorId && size.product_color_id === colorId) || (!size.product_color_id && size.color_name === color)
                    );

                    return (
                      <div key={colorIndex} className="mb-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{color}</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newColors = editForm.colors.filter((_, i) => i !== colorIndex);
                              const newColorSizes = editForm.color_sizes.filter(size => 
                                size.product_color_id !== colorId && size.color_name !== color
                              );
                              const newColorImages = editForm.color_images.filter(ci => ci.product_color_id !== colorId);
                              const newProductColors = editForm.product_colors?.filter(pc => pc.name !== color) || [];
                              setEditForm({ ...editForm, colors: newColors, color_sizes: newColorSizes, color_images: newColorImages, product_colors: newProductColors });
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="mt-2">
                          {sizesForColor.map((size, sizeIndex) => (
                            <div key={sizeIndex} className="flex gap-2 items-center mb-2">
                              <Input
                                value={size.size}
                                onChange={(e) => {
                                  const newSizes = [...editForm.color_sizes];
                                  const globalIndex = editForm.color_sizes.findIndex(s => s === size);
                                  newSizes[globalIndex].size = e.target.value;
                                  setEditForm({ ...editForm, color_sizes: newSizes });
                                }}
                                placeholder="Tamanho (ex: P, M, G)"
                                className="w-1/3"
                              />
                              <Input
                                type="number"
                                step="0.01"
                                value={size.price || editForm.preco}
                                onChange={(e) => {
                                  const newSizes = [...editForm.color_sizes];
                                  const globalIndex = editForm.color_sizes.findIndex(s => s === size);
                                  newSizes[globalIndex].price = parseFloat(e.target.value) || editForm.preco;
                                  setEditForm({ ...editForm, color_sizes: newSizes });
                                }}
                                placeholder="Preço"
                                className="w-1/3"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const newSizes = editForm.color_sizes.filter((_, i) => i !== editForm.color_sizes.findIndex(s => s === size));
                                  setEditForm({ ...editForm, color_sizes: newSizes });
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditForm({
                                ...editForm,
                                color_sizes: [...editForm.color_sizes, { size: "", price: editForm.preco, color_name: color, product_color_id: colorId || null }],
                              });
                            }}
                            className="mt-2"
                          >
                            <Plus className="h-4 w-4 mr-2" /> Adicionar Tamanho
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  <Input
                    value={colorInput}
                    onChange={(e) => setColorInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && colorInput.trim()) {
                        const newColor = colorInput.trim();
                        setEditForm({ ...editForm, colors: [...editForm.colors, newColor] });
                        setColorInput("");
                      }
                    }}
                    placeholder="Digite uma cor e pressione Enter"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Imagens Gerais</label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {editForm.images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={typeof image === "string" ? `http://localhost:8002/api/storage/${image}` : URL.createObjectURL(image)}
                          alt={`Imagem ${index + 1}`}
                          className="w-full h-24 object-cover rounded-md"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1"
                          onClick={() => {
                            const newImages = editForm.images.filter((_, i) => i !== index);
                            setEditForm({ ...editForm, images: newImages });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files) {
                        const newImages = Array.from(e.target.files);
                        setEditForm({ ...editForm, images: [...editForm.images, ...newImages] });
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Imagens por Cor</label>
                  {editForm.colors.map((color, colorIndex) => {
                    const colorId = getColorNameOrId(color);
                    const filteredImages = editForm.color_images?.filter(ci => ci.product_color_id === colorId) || [];
                    return (
                      <div key={colorIndex} className="mb-4">
                        <h4 className="text-sm font-medium">{color}</h4>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          {filteredImages.map((ci, index) => (
                            <div key={index} className="relative">
                              <img
                                src={typeof ci.image_path === "string" ? `http://localhost:8002/api/storage/${ci.image_path}` : URL.createObjectURL(ci.image_path)}
                                alt={`Imagem de ${color} ${index + 1}`}
                                className="w-full h-24 object-cover rounded-md"
                              />
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-1 right-1"
                                onClick={() => {
                                  const newColorImages = editForm.color_images?.filter((_, i) => i !== editForm.color_images?.findIndex(img => img === ci)) || [];
                                  setEditForm({ ...editForm, color_images: newColorImages });
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <Input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files) {
                              const newImages = Array.from(e.target.files).map(file => ({
                                product_color_id: colorId || 0,
                                image_path: file,
                              }));
                              setEditForm({
                                ...editForm,
                                color_images: [...(editForm.color_images || []), ...newImages],
                              });
                            }
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditProduct}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p>Tem certeza que deseja deletar o produto "{selectedProduct?.nome}" (ID: {selectedProduct?.id})?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteProduct}>
              Deletar
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
                      src={`http://localhost:8002/api/storage/${image}`}
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
}