import { Button } from "@/components/ui/button";
import { Instagram, Home, ShoppingCart, Filter } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom"; // Adicionei useLocation
import { useCart } from '@/context/CartContext';
import { useFilter } from '@/context/FilterContext';

export default function FooterStore() {
  const navigate = useNavigate();
  const location = useLocation(); // Hook para pegar a rota atual
  const { setCartOpen } = useCart();
  const { setFilterModalOpen } = useFilter();

  const handleCartClick = () => {
    setCartOpen(true);
  };

  const handleFilterClick = () => {
    setFilterModalOpen(true);
  };

  // Função para verificar se o item está ativo
  const isActive = (path : any) => location.pathname === path;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-10 md:hidden mx-auto rounded-t-[20px] overflow-hidden shadow-md w-[80%]">
        <div className="grid grid-cols-3">
          <button 
            onClick={() => navigate("/")}
            className={`flex flex-col items-center justify-center py-3 ${
              isActive("/") 
                ? "text-primary" 
                : "text-gray-500"
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs mt-1">Início</span>
          </button>

          <button 
            onClick={handleFilterClick}
            className={`flex flex-col items-center justify-center py-3 ${
              isActive("/filters") // Ajuste o path conforme sua rota de filtros
                ? "text-blue-600 border-t-2 border-blue-600" 
                : "text-gray-500"
            }`}
          >
            <Filter className="w-5 h-5" />
            <span className="text-xs mt-1">Filtros</span>
          </button>
          
          <button 
            onClick={handleCartClick}
            className={`flex flex-col items-center justify-center py-3 ${
              isActive("/cart") // Ajuste o path conforme sua rota de carrinho
                ? "text-blue-600 border-t-2 border-blue-600" 
                : "text-gray-500"
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="text-xs mt-1">Carrinho</span>
          </button>
        </div>
              </div>

      <footer className="w-full bg-background mt-10 pb-[60px] sm:pb-0">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="space-y-6">
              <div className="items-center gap-2">
                <img className="w-[120px]" src="https://chicaynino.com.br/wp-content/uploads/2024/04/Logo-Chica-y-Nino.svg"/>
              </div>
            </div>

            <div className="sm:text-right text-center space-y-2 items-center">
              <h3 className="text-lg font-semibold">Nos siga no Instagram!</h3>
              <a href={`https://www.instagram.com/chicaynino/`}><Button className="bg-primary text-white"><Instagram/>Seguir</Button></a>
            </div>
          </div>

          <div className="border-t border-gray-200 my-8"></div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-center">Copyright (c) {new Date().getFullYear()} Chica y Nino. <br className="sm:hidden"/>Todos os direitos reservados.</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <a href={`https://www.instagram.com/chicaynino/`}><Button variant="outline" size="sm" className="rounded-full border-gray-300 px-4">
                <Instagram className="w-4 h-4 mr-2" />
                Instagram
              </Button></a>
              <a href={`https://www.instagram.com/chicaynino/`}><Button variant="outline" size="sm" className="rounded-full border-gray-300 px-4">
                <img src="../src/assets/Whatsapp.svg" className="w-4 h-4 mr-2" />
                Whatsapp
              </Button></a>
            </div>
          </div>
        </div>

        <div className="h-2 bg-secondary w-full sm:mt-8"></div>
      </footer>
    </>
  );
}