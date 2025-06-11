import React, { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Loader2, Save, Plus, X, Image as ImageIcon, ChevronsUpDown } from 'lucide-react';

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
  price: number | null;
}

interface ProductColor {
  id: number;
  sizes: ColorSize[];
}

interface ColorImage {
  colorId: number;
  images: File[];
}

interface ImageData {
  url: string;
  base64: string;
}

interface ProductFormValues {
  nome: string;
  descricao: string | null;
  campaign_id: number;
  preco: number;
  images: File[] | null;
  colors: ProductColor[];
  colorImages: ColorImage[];
}

// Zod Schema
const formSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional().nullable(),
  campaign_id: z.number().min(1, 'Selecione uma campanha válida'),
  preco: z.number().min(0.01, 'Preço deve ser maior que zero'),
  images: z.any().optional(),
  colors: z
    .array(
      z.object({
        id: z.number().min(1, 'Cor inválida'),
        sizes: z
          .array(
            z.object({
              size: z.string().min(1, 'Tamanho é obrigatório'),
              price: z.number().min(0, 'Preço inválido').nullable(),
            })
          )
          .min(1, 'Pelo menos um tamanho é obrigatório por cor'),
      })
    )
    .min(1, 'Pelo menos uma cor é obrigatória'),
  colorImages: z
    .array(
      z.object({
        colorId: z.number().min(1, 'Cor inválida'),
        images: z.any(),
      })
    )
    .optional(),
});

const ProductClonePage: React.FC = () => {
  const [url, setUrl] = useState<string>('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [selectedColors, setSelectedColors] = useState<ProductColor[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [colorImages, setColorImages] = useState<{
    [colorId: number]: { files: File[]; previews: string[] };
  }>({});
  const [isColorDialogOpen, setIsColorDialogOpen] = useState(false);
  const [newColorName, setNewColorName] = useState('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '',
      descricao: '',
      campaign_id: 0,
      preco: 0.01,
      images: null,
      colors: [],
      colorImages: [],
    },
    mode: 'onChange',
  });

  const { watch, trigger, setValue } = form;

  // Fetch campaigns and colors on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [campaignsResponse, colorsResponse] = await Promise.all([
          axios.get<Campaign[]>('/api/api/campanhas'),
          axios.get<Color[]>('/api/api/product-colors'),
        ]);
        setCampaigns(campaignsResponse.data);
        setColors(colorsResponse.data);
      } catch (err) {
        setError(['Erro ao carregar dados iniciais.']);
        console.error(err);
      }
    };
    fetchInitialData();
  }, []);

  // Handle URL scraping
  const handleScrape = async () => {
    if (!url || !form.getValues('campaign_id')) {
      setError(['Por favor, insira uma URL válida e selecione uma campanha.']);
      return;
    }

    setLoading(true);
    setError([]);
    setSuccess(null);

    try {
      const response = await axios.post<{
        message: string;
        product: {
          nome: string;
          descricao: string | null;
          campaign_id: number;
          preco: number;
          colors: ProductColor[];
          images: ImageData[];
          color_images: ColorImage[];
        };
      }>('/api/api/products/scrape', {
        url,
        campaign_id: form.getValues('campaign_id'),
      });

      const product = response.data.product;
      // Ensure at least one color and size
      const colors = product.colors.length
        ? product.colors
        : [{ id: 1, sizes: [{ size: 'Único', price: null }] }];

      // Convert base64 images to Files
      const imageFiles = await Promise.all(
        product.images.map(async (imageData, index) => {
          const res = await fetch(imageData.base64);
          if (!res.ok) throw new Error(`Failed to process image: ${imageData.url}`);
          const blob = await res.blob();
          return new File([blob], `image-${index}.webp`, { type: 'image/webp' });
        })
      );
      const imagePreviews = product.images.map((img) => img.base64);

      // Set form values
      setValue('nome', product.nome, { shouldValidate: true });
      setValue('descricao', product.descricao, { shouldValidate: true });
      setValue('campaign_id', product.campaign_id, { shouldValidate: true });
      setValue('preco', product.preco, { shouldValidate: true });
      setValue('images', imageFiles, { shouldValidate: true });
      setValue('colors', colors, { shouldValidate: true });
      setValue('colorImages', product.color_images, { shouldValidate: true });

      setSelectedColors(colors);
      setImagePreviews(imagePreviews);
      setColorImages(
        product.color_images.reduce(
          (acc, ci) => ({
            ...acc,
            [ci.colorId]: {
              files: ci.images,
              previews: ci.images.map((_, i) => imagePreviews[i] || URL.createObjectURL(ci.images[i])),
            },
          }),
          {}
        )
      );

      await trigger();
    } catch (err) {
      const errorMessage =
        (err as AxiosError<{ error?: string }>).response?.data?.error ||
        'Erro ao extrair dados do produto.';
      setError([errorMessage]);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle image addition
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const currentImages = form.getValues('images') || [];
      const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
      setImagePreviews([...imagePreviews, ...newPreviews]);
      setValue('images', [...currentImages, ...newFiles], { shouldValidate: true });
      await trigger('images');
    }
  };

  // Handle image removal
  const handleRemoveImage = async (index: number) => {
    const currentImages = form.getValues('images') || [];
    const newImages = [...currentImages];
    newImages.splice(index, 1);
    const newPreviews = [...imagePreviews];
    URL.revokeObjectURL(newPreviews[index]);
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
    setValue('images', newImages.length > 0 ? newImages : null, { shouldValidate: true });
    await trigger('images');
  };

  // Handle color addition
  const handleAddColor = async (colorId: number) => {
    const color = colors.find((c) => c.id === colorId);
    if (color && !selectedColors.some((c) => c.id === colorId)) {
      const newColor = { id: colorId, sizes: [{ size: 'Único', price: null }] };
      const newColors = [...selectedColors, newColor];
      setSelectedColors(newColors);
      setValue('colors', newColors, { shouldValidate: true });
      await trigger('colors');
    }
  };

  // Handle color removal
  const handleRemoveColor = async (colorId: number) => {
    const newColors = selectedColors.filter((c) => c.id !== colorId);
    setSelectedColors(newColors);
    setValue('colors', newColors, { shouldValidate: true });
    if (colorImages[colorId]) {
      const updatedColorImages = { ...colorImages };
      updatedColorImages[colorId].previews.forEach((url) => URL.revokeObjectURL(url));
      delete updatedColorImages[colorId];
      setColorImages(updatedColorImages);
      const newColorImages = Object.entries(updatedColorImages).map(([colorId, data]) => ({
        colorId: parseInt(colorId),
        images: data.files,
      }));
      setValue('colorImages', newColorImages.length > 0 ? newColorImages : [], {
        shouldValidate: true,
      });
    }
    await trigger('colors');
  };

  // Handle size change for a color
  const handleColorSizeChange = async (
    colorId: number,
    sizeIndex: number,
    field: 'size' | 'price',
    value: string | number | null
  ) => {
    const newColors = [...selectedColors];
    const colorIndex = newColors.findIndex((c) => c.id === colorId);
    if (field === 'size') {
      newColors[colorIndex].sizes[sizeIndex].size = (value as string) || 'Único';
    } else {
      newColors[colorIndex].sizes[sizeIndex].price =
        typeof value === 'number' || value === null ? value : parseFloat(value as string) || null;
    }
    setSelectedColors(newColors);
    setValue('colors', newColors, { shouldValidate: true });
    await trigger('colors');
  };

  // Handle adding a size to a color
  const handleAddColorSize = async (colorId: number) => {
    const newColors = [...selectedColors];
    const colorIndex = newColors.findIndex((c) => c.id === colorId);
    newColors[colorIndex].sizes.push({ size: 'Único', price: null });
    setSelectedColors(newColors);
    setValue('colors', newColors, { shouldValidate: true });
    await trigger('colors');
  };

  // Handle removing a size from a color
  const handleRemoveColorSize = async (colorId: number, sizeIndex: number) => {
    const newColors = [...selectedColors];
    const colorIndex = newColors.findIndex((c) => c.id === colorId);
    newColors[colorIndex].sizes.splice(sizeIndex, 1);
    if (newColors[colorIndex].sizes.length === 0) {
      newColors[colorIndex].sizes.push({ size: 'Único', price: null });
    }
    setSelectedColors(newColors);
    setValue('colors', newColors, { shouldValidate: true });
    await trigger('colors');
  };

  // Handle color image addition
  const handleColorImageChange = async (colorId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
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
      setValue('colorImages', updatedColorImages, { shouldValidate: true });
      await trigger('colorImages');
    }
  };

  // Handle color image removal
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
    setValue('colorImages', updatedColorImages.length > 0 ? updatedColorImages : [], {
      shouldValidate: true,
    });
    await trigger('colorImages');
  };

  // Handle adding a new color
  const handleAddNewColor = async () => {
    if (!newColorName.trim()) {
      setError(['Nome da cor é obrigatório']);
      return;
    }
    try {
      const response = await axios.post<Color>('/api/api/product-colors', { name: newColorName });
      const newColor = response.data;
      setColors([...colors, newColor]);
      setNewColorName('');
      setIsColorDialogOpen(false);
      await handleAddColor(newColor.id);
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: string; errors?: Record<string, string[]> }>;
      if (axiosError.response?.status === 422 && axiosError.response?.data?.errors) {
        const validationErrors = Object.values(axiosError.response.data.errors).flat();
        setError(validationErrors);
      } else {
        setError(['Erro ao adicionar nova cor.']);
      }
      console.error(err);
    }
  };

  // Handle form submission
  const onSubmit = async (data: ProductFormValues) => {
    setLoading(true);
    setError([]);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('nome', data.nome);
      formData.append('descricao', data.descricao ?? '');
      formData.append('campaign_id', data.campaign_id.toString());
      formData.append('preco', data.preco.toString());

      data.colors.forEach((color, index) => {
        formData.append(`colors[${index}][id]`, color.id.toString());
        color.sizes.forEach((size, sizeIndex) => {
          formData.append(`colors[${index}][sizes][${sizeIndex}][size]`, size.size);
          if (size.price !== null) {
            formData.append(`colors[${index}][sizes][${sizeIndex}][price]`, size.price.toString());
          }
        });
      });

      if (data.images && data.images.length > 0) {
        data.images.forEach((image) => {
          formData.append('images[]', image);
        });
      }

      if (data.colorImages && data.colorImages.length > 0) {
        data.colorImages.forEach((colorImage, index) => {
          formData.append(`color_images[${index}][color_id]`, colorImage.colorId.toString());
          colorImage.images.forEach((image, imgIndex) => {
            formData.append(`color_images[${index}][images][${imgIndex}]`, image);
          });
        });
      }

      console.log('Enviando FormData:', {
        nome: data.nome,
        campaign_id: data.campaign_id,
        preco: data.preco,
        images_count: data.images?.length || 0,
        colors: data.colors,
        color_images: data.colorImages,
      });

      const response = await axios.post<{ message: string; product: any }>(
        '/api/api/products',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      setSuccess(response.data.message);
      form.reset();
      setSelectedColors([]);
      setImagePreviews([]);
      setColorImages({});
      setUrl('');
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: string; errors?: Record<string, string[]> }>;
      if (axiosError.response?.status === 422 && axiosError.response?.data?.errors) {
        const validationErrors = Object.values(axiosError.response.data.errors).flat();
        setError(validationErrors);
      } else {
        const errorMessage =
          axiosError.response?.data?.error || 'Erro ao criar o produto. Verifique os dados e tente novamente.';
        setError([errorMessage]);
      }
      console.error('Erro ao enviar requisição:', axiosError.response?.data);
    } finally {
      setLoading(false);
    }
  };

  // Prevent rendering if form context is not ready
  if (!form) {
    return <div>Carregando formulário...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Clonar Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <FormLabel htmlFor="url">URL do Produto</FormLabel>
                  <Input
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/product"
                  />
                </div>
                <FormField
                  control={form.control}
                  name="campaign_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campanha*</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value.toString()}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma campanha" />
                        </SelectTrigger>
                        <SelectContent>
                          {campaigns.map((campaign) => (
                            <SelectItem key={campaign.id} value={campaign.id.toString()}>
                              {campaign.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="button" onClick={handleScrape} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Extrair Dados
                </Button>

                {error.length > 0 && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertDescription>
                      {error.map((msg, index) => (
                        <div key={index}>{msg}</div>
                      ))}
                    </AlertDescription>
                  </Alert>
                )}

                {watch('nome') && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold">Dados Extraídos</h2>
                    <FormField
                      control={form.control}
                      name="nome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome*</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome do produto" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="descricao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Descrição do produto"
                              className="resize-none h-32"
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="preco"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preço*</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0.01)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                                  {colors
                                    .filter((c) => !selectedColors.some((sc) => sc.id === c.id))
                                    .map((color) => (
                                      <CommandItem
                                        key={color.id}
                                        value={color.name}
                                        onSelect={() => handleAddColor(color.id)}
                                      >
                                        <Checkbox
                                          className={`mr-2 h-4 w-4 ${
                                            selectedColors.some((c) => c.id === color.id)
                                              ? 'opacity-100'
                                              : 'opacity-0'
                                          }`}
                                        />
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
                                onChange={(e) => setNewColorName(e.target.value)}
                                placeholder="Nome da cor"
                              />
                            </div>
                            <DialogFooter>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsColorDialogOpen(false)}
                              >
                                Cancelar
                              </Button>
                              <Button type="button" onClick={handleAddNewColor}>
                                Adicionar
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                      {selectedColors.map((color) => (
                        <div key={color.id} className="space-y-4 border p-4 rounded-md">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">
                              {colors.find((c) => c.id === color.id)?.name}
                            </span>
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
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <FormLabel>Tamanhos para {colors.find((c) => c.id === color.id)?.name}*</FormLabel>
                              <Button
                                type="button"
                                onClick={() => handleAddColorSize(color.id)}
                                variant="outline"
                                size="sm"
                              >
                                <Plus className="mr-2 h-4 w-4" /> Adicionar Tamanho
                              </Button>
                            </div>
                            {color.sizes.map((size, index) => (
                              <div key={index} className="flex gap-3 items-center">
                                <Input
                                  value={size.size}
                                  onChange={(e) =>
                                    handleColorSizeChange(color.id, index, 'size', e.target.value)
                                  }
                                  placeholder="Tamanho"
                                />
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={size.price ?? ''}
                                  placeholder="Preço (opcional)"
                                  onChange={(e) =>
                                    handleColorSizeChange(
                                      color.id,
                                      index,
                                      'price',
                                      e.target.value ? parseFloat(e.target.value) : null
                                    )
                                  }
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
                          </div>
                          <div className="space-y-2">
                            <FormLabel>
                              Imagens para {colors.find((c) => c.id === color.id)?.name} (Opcional)
                            </FormLabel>
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
                              onChange={(e) => handleColorImageChange(color.id, e)}
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
                    <div className="space-y-4">
                      <FormLabel>Imagens Gerais*</FormLabel>
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
                      {imagePreviews.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {imagePreviews.map((preview, index) => (
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
                      <FormMessage>{form.formState.errors.images?.message}</FormMessage>
                    </div>
                    <CardFooter className="flex justify-end px-0 pt-4">
                      <Button type="submit" disabled={loading || !form.formState.isValid}>
                        {loading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Salvar Produto
                      </Button>
                    </CardFooter>
                  </div>
                )}
                {success && (
                  <Alert className="mt-4">
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductClonePage;