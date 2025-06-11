import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

interface Product {
  id: number;
  nome: string;
  tamanho?: string;
  cor?: string;
  status_estoque: "pendente" | "chegou";
  images: string[];
}

const API_URL = "http://localhost:8002/api";

interface ImageGeneratorProps {
  products: Product[];
  storageUrl: string;
  orderId: number; // Adicionado orderId como prop
  onComplete: (processedIds: number[], imageUrl: string) => void;
}

interface LoadedImage {
  element: HTMLImageElement;
  naturalWidth: number;
  naturalHeight: number;
}

/**
 * Configurações de Layout e Estilo
 * Ajuste estes valores para personalizar a aparência da imagem gerada
 */
const LAYOUT_CONFIG = {
    CANVAS_WIDTH: 600,
    CARD_HEIGHT: 280,
    CARD_PADDING: 20,
    IMAGE_SIZE: 180,
    TITLE_MARGIN_TOP: 60,
    PRODUCT_VERTICAL_GAP: 30,
    CARD_EXTERNAL_PADDING_X: 40,
    IMAGE_START_X: 60,
    TEXT_START_X: 280,
    CARD_PADDING_TOP: 40,
    CARD_PADDING_BOTTOM: 40,
    TEXT_LINE_HEIGHT: 30,
    BACKGROUND_COLOR: '#fff',
    CARD_BACKGROUND: '#f8f9fa',
    TEXT_COLOR_PRIMARY: '#333',
    TEXT_COLOR_SECONDARY: '#666',
    TEXT_COLOR_SUCCESS: '#28a745',
    TITLE_FONT: 'bold 20px Arial',
    PRODUCT_NAME_FONT: 'bold 18px Arial',
    DETAILS_FONT: '16px Arial',
    SHADOW_COLOR: 'rgba(0,0,0,0.1)',
    SHADOW_BLUR: 10,
    SHADOW_OFFSET_Y: 2,
    CARD_BORDER_RADIUS: 8,
};

const ImageGenerator: React.FC<ImageGeneratorProps> = ({ products, storageUrl, orderId, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadedImages, setLoadedImages] = useState<(LoadedImage | null)[]>([]);

  const calculateCanvasHeight = () => {
    return LAYOUT_CONFIG.TITLE_MARGIN_TOP + 
           (LAYOUT_CONFIG.CARD_HEIGHT + LAYOUT_CONFIG.PRODUCT_VERTICAL_GAP) * products.length;
  };

  const fetchImageAsBlob = async (url: string): Promise<string | null> => {
    try {
      const proxyUrl = url.replace(storageUrl, "/api/storage/app/public/");
      const response = await axios.get(proxyUrl, { responseType: "blob" });
      return URL.createObjectURL(response.data);
    } catch (error) {
      console.error("Erro ao baixar imagem:", error);
      return null;
    }
  };

  const loadImages = async () => {
    const loadedImagesPromises = products.map(async (product) => {
      if (!product.images.length) return null;
      
      const blob = await fetchImageAsBlob(`${storageUrl}${product.images[0]}`);
      if (!blob) return null;

      return new Promise<LoadedImage>((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            element: img,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight
          });
        };
        img.src = blob;
      });
    });

    const results = await Promise.all(loadedImagesPromises);
    setLoadedImages(results);
  };

  const calculateImageDimensions = (image: LoadedImage, maxSize: number) => {
    const ratio = Math.min(
      maxSize / image.naturalWidth,
      maxSize / image.naturalHeight
    );
    return {
      width: image.naturalWidth * ratio,
      height: image.naturalHeight * ratio,
      x: (maxSize - image.naturalWidth * ratio) / 2,
      y: (maxSize - image.naturalHeight * ratio) / 2
    };
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    canvas.width = LAYOUT_CONFIG.CANVAS_WIDTH;
    canvas.height = calculateCanvasHeight();

    ctx.fillStyle = LAYOUT_CONFIG.BACKGROUND_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Desenhar título com o número do pedido
    ctx.fillStyle = LAYOUT_CONFIG.TEXT_COLOR_PRIMARY;
    ctx.font = LAYOUT_CONFIG.TITLE_FONT;
    ctx.fillText(
      `📦 Pedido #${orderId} - Produtos que chegaram:`, 
      LAYOUT_CONFIG.CARD_EXTERNAL_PADDING_X, 
      30
    );

    products.forEach((product, index) => {
      const y = LAYOUT_CONFIG.TITLE_MARGIN_TOP + 
                index * (LAYOUT_CONFIG.CARD_HEIGHT + LAYOUT_CONFIG.PRODUCT_VERTICAL_GAP);
      const image = loadedImages[index];

      ctx.fillStyle = LAYOUT_CONFIG.CARD_BACKGROUND;
      ctx.shadowColor = LAYOUT_CONFIG.SHADOW_COLOR;
      ctx.shadowBlur = LAYOUT_CONFIG.SHADOW_BLUR;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = LAYOUT_CONFIG.SHADOW_OFFSET_Y;
      ctx.beginPath();
      ctx.roundRect(
        LAYOUT_CONFIG.CARD_EXTERNAL_PADDING_X, 
        y, 
        canvas.width - (LAYOUT_CONFIG.CARD_EXTERNAL_PADDING_X * 2), 
        LAYOUT_CONFIG.CARD_HEIGHT - LAYOUT_CONFIG.CARD_PADDING,
        LAYOUT_CONFIG.CARD_BORDER_RADIUS
      );
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      if (image) {
        const dimensions = calculateImageDimensions(image, LAYOUT_CONFIG.IMAGE_SIZE);
        const imageY = y + LAYOUT_CONFIG.CARD_PADDING_TOP;
        ctx.drawImage(
          image.element,
          LAYOUT_CONFIG.IMAGE_START_X + dimensions.x,
          imageY + dimensions.y,
          dimensions.width,
          dimensions.height
        );

        const textY = imageY + 20;
        ctx.fillStyle = LAYOUT_CONFIG.TEXT_COLOR_PRIMARY;
        ctx.font = LAYOUT_CONFIG.PRODUCT_NAME_FONT;
        ctx.fillText(product.nome, LAYOUT_CONFIG.TEXT_START_X, textY);
        
        ctx.fillStyle = LAYOUT_CONFIG.TEXT_COLOR_SECONDARY;
        ctx.font = LAYOUT_CONFIG.DETAILS_FONT;
        ctx.fillText(
          `📏 Tamanho: ${product.tamanho || 'N/A'}`, 
          LAYOUT_CONFIG.TEXT_START_X, 
          textY + LAYOUT_CONFIG.TEXT_LINE_HEIGHT
        );
        
        ctx.fillText(
          `🎨 Cor: ${product.cor || 'N/A'}`, 
          LAYOUT_CONFIG.TEXT_START_X, 
          textY + LAYOUT_CONFIG.TEXT_LINE_HEIGHT * 2
        );
        
        ctx.fillStyle = LAYOUT_CONFIG.TEXT_COLOR_SUCCESS;
        ctx.fillText(
          `✅ Status: ${product.status_estoque}`, 
          LAYOUT_CONFIG.TEXT_START_X, 
          textY + LAYOUT_CONFIG.TEXT_LINE_HEIGHT * 3
        );
      }
    });
  };

  const downloadImage = (canvas: HTMLCanvasElement) => {
    canvas.toBlob(async (blob) => {
      if (!blob) return;
  
      const formData = new FormData();
      formData.append("imagem", blob, `pedido_${orderId}_produtos_chegados.png`); // Nome do arquivo com orderId
  
      try {
        const response = await axios.post(`${API_URL}/salvar-imagem`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
  
        console.log("Imagem salva no Laravel:", response.data.url);
        onComplete(products.map((p) => p.id), response.data.url);
      } catch (error) {
        console.error("Erro ao enviar imagem para o Laravel:", error);
      }
    }, "image/png");
  };

  useEffect(() => {
    loadImages();
  }, [products]);

  useEffect(() => {
    if (loadedImages.length === products.length) {
      drawCanvas();
      const canvas = canvasRef.current;
      if (canvas) {
        downloadImage(canvas);
      }
    }
  }, [loadedImages]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="max-w-full h-auto"
        style={{ display: 'block', margin: '0 auto' }}
      />
    </div>
  );
};

export default ImageGenerator;