import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Form,
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Check, ChevronsUpDown, X, Plus, Image as ImageIcon } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle
} from '@/components/ui/alert';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Types
interface Campaign {
  id: number;
  nome: string;
}

interface Color {
  id: number;
  name: string;
}

interface ColorSize {
  size: string;
  price?: number;
}

interface ProductColor {
  id: number;
  sizes: ColorSize[];
}

interface ColorImage {
  colorId: number;
  images: File[];
}

interface ProductFormValues {
  nome: string;
  descricao: string;
  campaign_id: number;
  preco: number;
  images: FileList | null;
  colors: ProductColor[];
  colorImages?: ColorImage[];
}

// Função para formatar o preço no formato brasileiro
const formatPrice = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value.replace(/[^\d]/g, '')) / 100 : value;
  if (isNaN(num)) return 'R$ 0,00';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Validação do formulário com Zod
const formSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional(),
  campaign_id: z.number().min(1, 'Selecione uma campanha válida'),
  preco: z.number().min(0.01, 'Preço deve ser maior que zero'),
  images: z.any().optional(),
  colors: z.array(
    z.object({
      id: z.number().min(1, 'Cor inválida'),
      sizes: z.array(
        z.object({
          size: z.string().min(1, 'Tamanho é obrigatório'),
          price: z.number().min(0, 'Preço inválido').optional(),
        })
      ).min(1, 'Pelo menos um tamanho é obrigatório por cor'),
    })
  ).min(1, 'Pelo menos uma cor é obrigatória'),
  colorImages: z
    .array(
      z.object({
        colorId: z.number().min(1, 'Cor inválida'),
        images: z.any().optional(),
      })
    )
    .optional(),
});

const ProductForm: React.FC = () => {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [selectedColors, setSelectedColors] = useState<ProductColor[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isColorDialogOpen, setIsColorDialogOpen] = useState(false);
  const [newColorName, setNewColorName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [colorImages, setColorImages] = useState<{ [colorId: number]: { files: File[]; previews: string[] } }>({});
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);

  const { campaignId } = useParams<{ campaignId?: string }>();
  const location = useLocation();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '',
      descricao: '',
      campaign_id: 0,
      preco: 0,
      images: null,
      colors: [],
    },
    mode: 'onChange',
  });

  const { watch, trigger, setValue } = form;
  const basePrice = watch('preco');

  const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:8002/api';

  // Carregar dados iniciais
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const campaignsResponse = await axios.get(`${API_URL}/campanhas`);
        setCampaigns(campaignsResponse.data);

        if (campaignId) {
          const parsedId = parseInt(campaignId, 10);
          const campaignResponse = await axios.get(`${API_URL}/campanhas/${parsedId}`).catch(() => null);
          if (campaignResponse && campaignResponse.data) {
            setCampaign(campaignResponse.data);
            form.setValue('campaign_id', parsedId);
          }
        }

        const colorsResponse = await axios.get(`${API_URL}/product-colors`);
        setColors(colorsResponse.data);
      } catch (error) {
        console.error('Erro ao buscar dados iniciais', error);
      }
    };
    fetchInitialData();
  }, [campaignId, form]);

  // Lidar com imagens compartilhadas (se aplicável)
  useEffect(() => {
    const handleSharedImages = async () => {
      const urlParams = new URLSearchParams(location.search);
      const sharedImagesJson = urlParams.get('images');
      if (sharedImagesJson) {
        try {
          const imageUrls: string[] = JSON.parse(decodeURIComponent(sharedImagesJson));
          if (imageUrls.length > 0) {
            setPreviews(imageUrls);
            const files = await fetchSharedFiles(imageUrls);
            if (files.length > 0) {
              setImages(files);
              const dataTransfer = new DataTransfer();
              files.forEach(file => dataTransfer.items.add(file));
              setValue('images', dataTransfer.files, { shouldValidate: true });
              await trigger('images');
            }
          }
        } catch (error) {
          console.error('Erro ao processar imagens compartilhadas:', error);
        }
      }
    };
    handleSharedImages();
  }, [location, setValue, trigger]);

  const fetchSharedFiles = async (imageUrls: string[]): Promise<File[]> => {
    const files: File[] = [];
    for (const url of imageUrls) {
      try {
        const response = await fetch(url, { mode: 'cors', cache: 'no-store' });
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        const blob = await response.blob();
        const fileName = url.split('/').pop() || `shared-image-${Date.now()}.jpg`;
        const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
        files.push(file);
      } catch (error) {
        console.error('Erro ao buscar imagem:', url, error);
      }
    }
    return files;
  };

  // Tamanhos disponíveis
  const handleAddSize = async () => {
    setAvailableSizes([...availableSizes, '']);
  };

  const handleSizeChange = async (index: number, value: string) => {
    const newSizes = [...availableSizes];
    newSizes[index] = value;
    setAvailableSizes(newSizes);
  };

  const handleRemoveSize = async (index: number) => {
    const newSizes = [...availableSizes];
    newSizes.splice(index, 1);
    setAvailableSizes(newSizes);
  };

  // Cores
  const handleAddColor = async (colorId: number) => {
    const color = colors.find(c => c.id === colorId);
    if (color && !selectedColors.some(c => c.id === colorId)) {
      const newColor = { id: colorId, sizes: availableSizes.map(size => ({ size, price: undefined })) };
      setSelectedColors([...selectedColors, newColor]);
      form.setValue('colors', [...selectedColors, newColor]);
      await trigger('colors');
    }
  };

  const handleRemoveColor = async (colorId: number) => {
    const newColors = selectedColors.filter(c => c.id !== colorId);
    setSelectedColors(newColors);
    form.setValue('colors', newColors);
    if (colorImages[colorId]) {
      const updatedColorImages = { ...colorImages };
      updatedColorImages[colorId].previews.forEach(url => URL.revokeObjectURL(url));
      delete updatedColorImages[colorId];
      setColorImages(updatedColorImages);
      const newColorImages = Object.entries(updatedColorImages).map(([colorId, data]) => ({
        colorId: parseInt(colorId),
        images: data.files,
      }));
      form.setValue('colorImages', newColorImages.length > 0 ? newColorImages : undefined);
    }
    await trigger('colors');
  };

  const handleColorSizeChange = async (colorId: number, sizeIndex: number, field: 'size' | 'price', value: string | number) => {
    const newColors = [...selectedColors];
    const colorIndex = newColors.findIndex(c => c.id === colorId);
    if (field === 'size') {
      newColors[colorIndex].sizes[sizeIndex].size = value as string;
    } else {
      newColors[colorIndex].sizes[sizeIndex].price = typeof value === 'number' ? value : parseFloat(value.replace(/[^\d]/g, '')) / 100 || undefined;
    }
    setSelectedColors(newColors);
    form.setValue('colors', newColors);
    await trigger('colors');
  };

  const handleAddColorSize = async (colorId: number) => {
    const newColors = [...selectedColors];
    const colorIndex = newColors.findIndex(c => c.id === colorId);
    newColors[colorIndex].sizes.push({ size: '', price: undefined });
    setSelectedColors(newColors);
    form.setValue('colors', newColors);
    await trigger('colors');
  };

  const handleRemoveColorSize = async (colorId: number, sizeIndex: number) => {
    const newColors = [...selectedColors];
    const colorIndex = newColors.findIndex(c => c.id === colorId);
    newColors[colorIndex].sizes.splice(sizeIndex, 1);
    setSelectedColors(newColors);
    form.setValue('colors', newColors);
    await trigger('colors');
  };

  // Imagens por cor
  const handleColorImageChange = async (colorId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      const currentColorImages = { ...colorImages };
      currentColorImages[colorId] = {
        files: [...(currentColorImages[colorId]?.files || []), ...newFiles],
        previews: [...(currentColorImages[colorId]?.previews || []), ...newPreviews],
      };
      setColorImages(currentColorImages);
      const updatedColorImages = Object.entries(currentColorImages).map(([colorId, data]) => ({
        colorId: parseInt(colorId),
        images: data.files,
      }));
      form.setValue('colorImages', updatedColorImages);
      await trigger('colorImages');
    }
  };

  const handleRemoveColorImage = async (colorId: number, index: number) => {
    const currentColorImages = { ...colorImages };
    const colorData = currentColorImages[colorId];
    colorData.files.splice(index, 1);
    URL.revokeObjectURL(colorData.previews[index]);
    colorData.previews.splice(index, 1);
    if (colorData.files.length === 0) {
      delete currentColorImages[colorId];
    }
    setColorImages(currentColorImages);
    const updatedColorImages = Object.entries(currentColorImages).map(([colorId, data]) => ({
      colorId: parseInt(colorId),
      images: data.files,
    }));
    form.setValue('colorImages', updatedColorImages.length > 0 ? updatedColorImages : undefined);
    await trigger('colorImages');
  };

  // Imagens gerais
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages = Array.from(e.target.files);
      setImages([...images, ...newImages]);
      const newPreviews = newImages.map(file => URL.createObjectURL(file));
      setPreviews([...previews, ...newPreviews]);
      form.setValue('images', e.target.files);
      await trigger('images');
    }
  };

  const handleRemoveImage = async (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
    const newPreviews = [...previews];
    URL.revokeObjectURL(newPreviews[index]);
    newPreviews.splice(index, 1);
    setPreviews(newPreviews);
    const dataTransfer = new DataTransfer();
    newImages.forEach(file => dataTransfer.items.add(file));
    form.setValue('images', dataTransfer.files.length > 0 ? dataTransfer.files : null);
    await trigger('images');
  };

  // Adicionar nova cor
  const handleAddNewColor = async () => {
    if (!newColorName.trim()) return;
    try {
      const response = await axios.post(`${API_URL}/product-colors`, { name: newColorName });
      const newColor = response.data;
      setColors([...colors, newColor]);
      setNewColorName('');
      setIsColorDialogOpen(false);
    } catch (error) {
      console.error('Erro ao adicionar nova cor', error);
    }
  };

  // Submissão do formulário
  const onSubmit = async (data: ProductFormValues) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('nome', data.nome);
      formData.append('descricao', data.descricao || '');
      formData.append('campaign_id', data.campaign_id.toString());
      formData.append('preco', data.preco.toString());

      data.colors.forEach((color, index) => {
        formData.append(`colors[${index}][id]`, color.id.toString());
        color.sizes.forEach((size, sizeIndex) => {
          formData.append(`colors[${index}][sizes][${sizeIndex}][size]`, size.size);
          if (size.price) {
            formData.append(`colors[${index}][sizes][${sizeIndex}][price]`, size.price.toString());
          }
        });
      });

      if (images.length > 0) {
        images.forEach((image, index) => {
          formData.append('images[]', image, image.name);
        });
      }

      if (data.colorImages && data.colorImages.length > 0) {
        data.colorImages.forEach((colorImage, index) => {
          formData.append(`color_images[${index}][color_id]`, colorImage.colorId.toString());
          colorImage.images.forEach((image, imgIndex) => {
            formData.append(`color_images[${index}][images][${imgIndex}]`, image, image.name);
          });
        });
      }

      const response = await axios.post(`${API_URL}/products`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('Resposta do backend:', response.data);

      setShowSuccess(true);
      form.reset({ campaign_id: campaign ? campaign.id : 0, nome: '', descricao: '', preco: 0, images: null, colors: [] });
      setAvailableSizes([]);
      setSelectedColors([]);
      setImages([]);
      setColorImages({});
      previews.forEach(url => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
      setPreviews([]);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Erro ao cadastrar produto', error);
      if (error.response) console.log('Detalhes do erro:', error.response.data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Cadastro de Produto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {showSuccess && (
            <Alert className="mb-6 border-green-500 bg-green-50">
              <AlertTitle className="text-green-700">Sucesso!</AlertTitle>
              <AlertDescription className="text-green-600">Produto cadastrado com sucesso.</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Nome */}
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Produto*</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do produto" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Descrição */}
              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descrição do produto" className="resize-none h-32" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campanha */}
              <FormField
                control={form.control}
                name="campaign_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campanha*</FormLabel>
                    {campaign ? (
                      <Input value={campaign.nome} disabled className="bg-gray-50" />
                    ) : (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-between">
                            {field.value && campaigns.find(c => c.id === field.value)?.nome || "Selecione uma campanha"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Buscar campanha..." />
                            <CommandList>
                              <CommandEmpty>Nenhuma campanha encontrada.</CommandEmpty>
                              <CommandGroup>
                                {campaigns.map((camp) => (
                                  <CommandItem
                                    key={camp.id}
                                    value={camp.nome}
                                    onSelect={async () => {
                                      form.setValue('campaign_id', camp.id);
                                      await trigger('campaign_id');
                                    }}
                                  >
                                    <Check className={`mr-2 h-4 w-4 ${field.value === camp.id ? "opacity-100" : "opacity-0"}`} />
                                    {camp.nome} (ID: {camp.id})
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Preço Base */}
              <FormField
                control={form.control}
                name="preco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço Base*</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="R$ 0,00"
                        value={formatPrice(field.value)}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/[^\d]/g, '');
                          const numericValue = parseFloat(rawValue) / 100 || 0;
                          field.onChange(numericValue);
                        }}
                      />
                    </FormControl>
                    <FormDescription>Preço padrão do produto, usado se não especificado por cor/tamanho.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tamanhos Disponíveis */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <FormLabel>Tamanhos Disponíveis*</FormLabel>
                  <Button type="button" onClick={handleAddSize} variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Adicionar Tamanho
                  </Button>
                </div>
                {availableSizes.length === 0 && (
                  <p className="text-sm text-gray-500 italic">Nenhum tamanho adicionado.</p>
                )}
                {availableSizes.map((size, index) => (
                  <div key={index} className="flex gap-3 items-center">
                    <Input
                      value={size}
                      onChange={e => handleSizeChange(index, e.target.value)}
                      placeholder="Ex: P, M, G, 38, 42..."
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSize(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <FormDescription>Defina os tamanhos disponíveis para o produto.</FormDescription>
              </div>

              {/* Cores com Tamanhos e Imagens */}
              <div className="space-y-4">
                <FormLabel>Cores Disponíveis*</FormLabel>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[200px] justify-between">
                        Adicionar Cor
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0">
                      <Command>
                        <CommandInput placeholder="Buscar cor..." />
                        <CommandList>
                          <CommandEmpty>Nenhuma cor encontrada.</CommandEmpty>
                          <CommandGroup>
                            {colors.filter(c => !selectedColors.some(sc => sc.id === c.id)).map(color => (
                              <CommandItem
                                key={color.id}
                                value={color.name}
                                onSelect={() => handleAddColor(color.id)}
                              >
                                <Check className={`mr-2 h-4 w-4 ${selectedColors.some(c => c.id === color.id) ? "opacity-100" : "opacity-0"}`} />
                                {color.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  <Dialog open={isColorDialogOpen} onOpenChange={setIsColorDialogOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="ghost" size="icon">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Adicionar Nova Cor</DialogTitle>
                        <DialogDescription>Insira o nome da nova cor.</DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Input
                          value={newColorName}
                          onChange={e => setNewColorName(e.target.value)}
                          placeholder="Nome da cor"
                        />
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsColorDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="button" onClick={handleAddNewColor}>
                          Adicionar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {selectedColors.map(color => (
                  <div key={color.id} className="space-y-4 border p-4 rounded-md">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{colors.find(c => c.id === color.id)?.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveColor(color.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Tamanhos por Cor */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <FormLabel>Tamanhos para {colors.find(c => c.id === color.id)?.name}*</FormLabel>
                        <Button type="button" onClick={() => handleAddColorSize(color.id)} variant="outline" size="sm">
                          <Plus className="mr-2 h-4 w-4" /> Adicionar Tamanho
                        </Button>
                      </div>
                      {color.sizes.map((size, index) => (
                        <div key={index} className="flex gap-3 items-center">
                          <Input
                            value={size.size}
                            onChange={e => handleColorSizeChange(color.id, index, 'size', e.target.value)}
                            placeholder="Tamanho"
                          />
                          <Input
                            type="text"
                            value={size.price ? formatPrice(size.price) : ''}
                            onChange={e => handleColorSizeChange(color.id, index, 'price', e.target.value)}
                            placeholder={formatPrice(basePrice)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveColorSize(color.id, index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <FormDescription>Deixe o preço em branco para usar o preço base.</FormDescription>
                    </div>

                    {/* Imagens por Cor */}
                    <div className="space-y-2">
                      <FormLabel>Imagens para {colors.find(c => c.id === color.id)?.name} (Opcional)</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById(`color-upload-${color.id}`)?.click()}
                      >
                        <ImageIcon className="h-4 w-4 mr-2" /> Adicionar Imagens
                      </Button>
                      <Input
                        id={`color-upload-${color.id}`}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={e => handleColorImageChange(color.id, e)}
                        className="hidden"
                      />
                      {colorImages[color.id]?.previews?.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {colorImages[color.id].previews.map((preview, index) => (
                            <div key={index} className="relative">
                              <img
                                src={preview}
                                alt={`Preview ${index}`}
                                className="w-full h-32 object-cover rounded-md border"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2"
                                onClick={() => handleRemoveColorImage(color.id, index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <FormMessage>{form.formState.errors.colors?.message}</FormMessage>
              </div>

              {/* Imagens Gerais */}
              <div className="space-y-4">
                <FormLabel>Imagens Gerais (Opcional)</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  <ImageIcon className="h-4 w-4 mr-2" /> Selecionar Imagens
                </Button>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
                {previews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {previews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img
                          src={preview}
                          alt={`Preview ${index}`}
                          className="w-full h-32 object-cover rounded-md border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => handleRemoveImage(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <FormDescription>Imagens gerais do produto, aplicáveis a todas as cores.</FormDescription>
              </div>

              <CardFooter className="flex justify-end px-0 pt-4">
                <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
                  {isSubmitting ? 'Cadastrando...' : 'Cadastrar Produto'}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductForm;