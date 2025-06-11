"use client";

import { useState, useEffect, useRef } from "react";
import { Menu, ShoppingBag, X, ShoppingCart, User, UserCircle, Package, Home, Tag, LogOut, ChevronDown, ChevronRight, Image } from "lucide-react";
import { Cart } from "@/components/Cart";
import { useCart } from '@/context/CartContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

const API_URL = "http://localhost:8002/api";

interface NavLink {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface Campaign {
  id: number;
  nome: string;
  marca?: string;
  data_inicio: string;
  data_fim: string;
}

const Header = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]); // Estado para campanhas
  const [activeMenuItem, setActiveMenuItem] = useState('/');
  const [campaignsMenuOpen, setCampaignsMenuOpen] = useState(true); // Submenu aberto por padrão
  const sidebarRef = useRef<HTMLDivElement>(null);
  const cartRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const { cartItemCount, isCartOpen, setCartOpen } = useCart();
  const [isMobile, setIsMobile] = useState(false);
  const { user, logout } = useAuth();
  const isAuthenticated = !!user;
  const navigate = useNavigate();

  const navLinks: NavLink[] = [
    { label: "Produtos para meninos", href: "/?genero=menino", icon: <User className="w-5 h-5" /> },
    { label: "Produtos para meninas", href: "/?genero=menina", icon: <UserCircle className="w-5 h-5" /> },
  ];

  // Buscar campanhas ativas ao montar o componente
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await axios.get(`${API_URL}/campanhasStore`);
        setCampaigns(response.data);
      } catch (error) {
        console.error('Error fetching campaigns:', error);
      }
    };
    fetchCampaigns();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
        setCartOpen(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (
        overlayRef.current &&
        overlayRef.current.contains(event.target as Node) &&
        (!sidebarRef.current || !sidebarRef.current.contains(event.target as Node)) &&
        (!cartRef.current || !cartRef.current.contains(event.target as Node))
      ) {
        setSidebarOpen(false);
        setCartOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    document.addEventListener("mousedown", handleClickOutside);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setCartOpen]);

  useEffect(() => {
    if (isSidebarOpen || isCartOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isSidebarOpen, isCartOpen]);

  const handleOrdersClick = () => {
    setActiveMenuItem('/meus-pedidos');
    navigate('/meus-pedidos');
    if (isMobile) setSidebarOpen(false);
  };

  const handleFotosClick = () => {
    setActiveMenuItem('/fotos');
    navigate('/fotos');
    if (isMobile) setSidebarOpen(false);
  };

  const handleHomeClick = () => {
    setActiveMenuItem('/');
    navigate('/');
    if (isMobile) setSidebarOpen(false);
  };

  const handleCartClick = () => {
    setCartOpen(true);
    if (isMobile) setSidebarOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleNavLinkClick = (href: string) => {
    setActiveMenuItem(href);
    navigate(href);
    if (isMobile) setSidebarOpen(false);
  };

  const toggleCampaignsMenu = () => {
    setCampaignsMenuOpen(!campaignsMenuOpen);
  };

  const isCampaignActive = (campaignId: number) => {
    return activeMenuItem === `/campanha/${campaignId}`;
  };

  const isAnyCampaignActive = () => {
    return campaigns.some(campaign => activeMenuItem === `/campanha/${campaign.id}`);
  };

  return (
    <div className="fixed w-full z-20 shadow-sm">
      <header className="bg-[#f3f6e6] px-4 sm:py-4 py-2 relative z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {isMobile && isAuthenticated && (
            <div className="flex items-center w-[33%]">
              <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2" aria-label="Open menu">
                <Menu className="w-6 h-6 text-[#6b8355]" />
              </button>
            </div>
          )}

          <div className="flex items-center w-[33%] sm:w-[10%]">
            <button onClick={handleHomeClick}>
              <img
                src="https://chicaynino.com.br/wp-content/uploads/2024/04/Logo-Chica-y-Nino.svg"
                alt="Chicos y Niños"
                className="h-12"
              />
            </button>
          </div>

          {!isMobile && (
            <nav className="relative text-left w-[60%]">
              <ul className="flex space-x-8 text-left">
              {campaigns.length > 0 && (
                    <>
                      {campaigns.map((campaign) => (
                        <li key={campaign.id}>
                          <button
                            onClick={() => handleNavLinkClick(`/campanha/${campaign.id}`)}
                            className="flex items-center text-[#6b8355] hover:text-[#4f6140] text-md font-medium py-2"
                          >
                            <span>{campaign.nome}</span>
                          </button>
                        </li>
                      ))}
                    </>
                  )}
              </ul>
            </nav>
          )}

          <div className="flex items-center justify-end space-x-4 w-[33%] sm:w-[20%]">
           
              <div className="flex items-center space-x-1 text-sm">
                 {isAuthenticated && (
                <button aria-label="Favorites" className="p-2 flex text-md items-center" onClick={handleOrdersClick}>
                  <ShoppingBag className="w-5 h-6 text-[#6b8355] mr-1" />
                </button>
                 )}
                <button
                  aria-label="Shopping cart"
                  className="p-2 relative flex items-center text-sm"
                  onClick={handleCartClick}
                >
                  <ShoppingCart className="w-6 h-6 text-[#6b8355] mr-1" />
                  {cartItemCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {cartItemCount}
                    </span>
                  )}
                </button>
              </div>
           
          </div>
        </div>
      </header>

      {isMobile && (
        <>
          <div
            ref={overlayRef}
            className={`fixed inset-0 bg-black/50 z-30 transition-opacity duration-300 ${
              (isSidebarOpen || isCartOpen) ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          />

          <div
            ref={sidebarRef}
            className={`fixed top-0 left-0 h-full w-[280px] bg-white z-40 transform transition-transform duration-300 ease-in-out ${
              isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b">
                <button onClick={handleHomeClick}>
                  <img
                    src="https://chicaynino.com.br/wp-content/uploads/2024/04/Logo-Chica-y-Nino.svg"
                    alt="Chicos y Niños"
                    className="h-10"
                  />
                </button>
                {isSidebarOpen && (
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-2 transition-opacity duration-300 ease-in-out"
                    aria-label="Close menu"
                  >
                    <X className="w-6 h-6 text-[#6b8355]" />
                  </button>
                )}
              </div>

              <div className="py-8 px-2">                
                <nav className="flex-1">
                  <ul className="space-y-1">
                    <li>
                      <button
                        onClick={() => handleNavLinkClick(`/`)}
                        className={`flex items-center w-full px-4 py-3 rounded-lg text-sm ${
                          activeMenuItem === '/' 
                            ? 'bg-background text-primary' 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Home className={`w-5 h-5 mr-3 ${
                          activeMenuItem === '/' ? 'text-primary' : 'text-gray-500'
                        }`} />
                        <span>Todos os produtos</span>
                      </button>
                    </li>
                    
                    <li>
                      <button
                        onClick={handleOrdersClick}
                        className={`flex items-center w-full px-4 py-3 rounded-lg text-sm ${
                          activeMenuItem === '/meus-pedidos' 
                            ? 'bg-background text-primary' 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <ShoppingBag className={`w-5 h-5 mr-3 ${
                          activeMenuItem === '/meus-pedidos' ? 'text-primary' : 'text-gray-500'
                        }`} />
                        <span>Meus Pedidos</span>
                      </button>
                    </li>

                    <li>
                      <button
                        onClick={handleFotosClick}
                        className={`flex items-center w-full px-4 py-3 rounded-lg text-sm ${
                          activeMenuItem === '/fotos' 
                            ? 'bg-background text-primary' 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Image className={`w-5 h-5 mr-3 ${
                          activeMenuItem === '/fotos' ? 'text-primary' : 'text-gray-500'
                        }`} />
                        <span>Fotos</span>
                      </button>
                    </li>
                    
                    <li>
                      <button
                        onClick={handleCartClick}
                        className={`flex items-center w-full px-4 py-3 rounded-lg text-sm ${
                          isCartOpen ? 'bg-background text-primary' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <ShoppingCart className={`w-5 h-5 mr-3 ${
                          isCartOpen ? 'text-primary' : 'text-gray-500'
                        }`} />
                        <span>Carrinho</span>
                        {cartItemCount > 0 && (
                          <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {cartItemCount}
                          </span>
                        )}
                      </button>
                    </li>
                  </ul>
                </nav>
                
                {campaigns.length > 0 && (
                  <div className="mt-6">
                    <button 
                      onClick={toggleCampaignsMenu}
                      className={`flex items-center justify-between w-full px-4 py-3 text-sm font-medium ${
                        isAnyCampaignActive() ? 'text-primary' : 'text-gray-700'
                      }`}
                    >
                      <div className="flex items-center">
                        <Tag className={`w-5 h-5 mr-3 ${
                          isAnyCampaignActive() ? 'text-primary' : 'text-gray-500'
                        }`} />
                        <span>Campanhas</span>
                      </div>
                      {campaignsMenuOpen ? 
                        <ChevronDown className="w-5 h-5" /> : 
                        <ChevronRight className="w-5 h-5" />
                      }
                    </button>
                    
                    {campaignsMenuOpen && (
                      <div className="ml-4 pl-4 border-l border-gray-200">
                        <ul className="space-y-1 py-1">
                          {campaigns.map((campaign) => (
                            <li key={campaign.id}>
                              <button
                                onClick={() => handleNavLinkClick(`/campanha/${campaign.id}`)}
                                className={`flex items-center w-full px-4 py-2 rounded-lg text-sm ${
                                  isCampaignActive(campaign.id)
                                    ? 'bg-background text-primary font-medium' 
                                    : 'text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                <span>{campaign.nome}</span>
                                {isCampaignActive(campaign.id) && (
                                  <ChevronRight className="w-4 h-4 ml-auto text-gray-400" />
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {isAuthenticated && (
                <div className="mt-auto border-t py-3 px-2">
                  <div className="text-sm font-medium text-gray-400 px-4 mb-2">CONTA</div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-3 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <LogOut className="w-5 h-5 mr-3 text-gray-500" />
                    <span>Sair</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      
        <div
          ref={cartRef}
          className={`fixed top-0 right-0 h-full w-[380px] bg-[#f3f6e6] z-40 transform transition-transform duration-300 ease-in-out ${
            isCartOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <Cart onClose={() => setCartOpen(false)} />
        </div>
     
    </div>
  );
};

export default Header;