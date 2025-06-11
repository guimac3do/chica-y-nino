import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { X } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, CarouselApi } from "@/components/ui/carousel";

interface Image {
  id: number;
  image_path: string;
  thumbnail_path: string;
}

const STORAGE_URL = "http://localhost:8002/api/storage/app/public/";

const ImageUpload: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [images, setImages] = useState<Image[]>([]);
  const [message, setMessage] = useState<string>('');
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);

  useEffect(() => {
    fetchImages();
  }, []);

  useEffect(() => {
    if (carouselApi) {
      const handleSelect = () => {
        const currentIndex = carouselApi.selectedScrollSnap();
        setSelectedImageIndex(currentIndex);
      };
      carouselApi.on('select', handleSelect);
      return () => {
        carouselApi.off('select', handleSelect);
      };
    }
  }, [carouselApi]);

  const fetchImages = async () => {
    try {
      const response = await axios.get('http://localhost:8002/api/images');
      setImages(response.data);
    } catch (error) {
      console.error('Erro ao carregar imagens:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      setMessage('Por favor, selecione pelo menos uma imagem.');
      return;
    }

    const formData = new FormData();
    files.forEach(file => formData.append('images[]', file));

    try {
      const response = await axios.post('http://localhost:8002/api/images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(response.data.message);
      setFiles([]);
      fetchImages();
    } catch (error) {
      setMessage('Erro ao enviar imagens.');
      console.error(error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Tem certeza que deseja deletar esta imagem?')) {
      try {
        const response = await axios.delete(`/api/api/images/${id}`);
        setMessage(response.data.message);
        setImages(images.filter(image => image.id !== id));
      } catch (error) {
        setMessage('Erro ao deletar imagem.');
        console.error(error);
      }
    }
  };

  const openFullScreen = (index: number) => {
    setSelectedImageIndex(index);
    setIsFullScreenOpen(true);
  };

  const handleOutsideClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Verifica se o clique foi fora da imagem e dos controles do carrossel
    if (
      !target.closest('img') &&
      !target.closest('.carousel-control-prev') &&
      !target.closest('.carousel-control-next') &&
      !target.closest('button')
    ) {
      setIsFullScreenOpen(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Upload de Imagens</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <Button
          type="submit"
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          Enviar
        </Button>
      </form>
      {message && <p className="mb-4 text-green-600">{message}</p>}

      <h2 className="text-xl font-semibold mb-4">Imagens Cadastradas</h2>
      {images.length === 0 ? (
        <p className="text-gray-500">Nenhuma imagem cadastrada ainda.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div key={image.id} className="border rounded overflow-hidden relative">
              <img
                src={`${STORAGE_URL}${image.thumbnail_path}`}
                alt="Thumbnail"
                className="w-full h-48 object-cover cursor-pointer"
                onClick={() => openFullScreen(index)}
              />
              <Button
                onClick={() => handleDelete(image.id)}
                className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded hover:bg-red-600"
              >
                Deletar
              </Button>
            </div>
          ))}
        </div>
      )}

      {isFullScreenOpen && (
        <div
          className="fixed inset-0 h-screen z-50 bg-black bg-opacity-90 flex items-center justify-center"
          onClick={handleOutsideClick}
        >
          <Button
            variant="ghost"
            className="absolute top-4 right-4 text-white bg-gray-800 rounded-full hover:bg-gray-800 z-50"
            onClick={() => setIsFullScreenOpen(false)}
          >
            <X className="w-6 h-6" /> Voltar
          </Button>
          <Carousel
            className="w-full max-w-5xl"
            opts={{ startIndex: selectedImageIndex }}
            setApi={setCarouselApi}
          >
            <CarouselContent>
              {images.map((image, index) => (
                <CarouselItem key={index}>
                  <div className="flex items-center justify-center h-screen">
                    <img
                      src={`${STORAGE_URL}${image.image_path}`}
                      alt={`Imagem ${index + 1}`}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
            <div className="absolute bottom-8 right-8 bg-black/70 text-white px-3 py-1 rounded-md">
              {selectedImageIndex + 1} / {images.length}
            </div>
          </Carousel>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;