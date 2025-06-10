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

const Images: React.FC = () => {
  const [images, setImages] = useState<Image[]>([]);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await axios.get('https://localhost:8002/api/images');
        setImages(response.data);
      } catch (error) {
        console.error('Erro ao carregar imagens:', error);
      }
    };
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
        <h1 className="text-2xl font-bold mb-4">Galeria de Imagens</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div key={image.id} className="border rounded overflow-hidden">
              <img
                src={`${STORAGE_URL}${image.image_path}`}
                alt="Imagem"
                className="w-full h-48 object-cover cursor-pointer"
                onClick={() => openFullScreen(index)}
              />
            </div>
          ))}
        </div>

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

export default Images;