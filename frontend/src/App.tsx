import { Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Toaster } from '@/components/ui/toaster';
import AdminLayout from './layouts/AdminLayout';
import Layout from './layouts/Layout';
import Home from './pages/home';
import Login from './pages/login';
import OrdersList from './pages/OrdersList';
import OrderDetails from './pages/OrderDetails';
import ProductDetails from './pages/product';
import Campanhas from './admin/campanhas';
import CampaignProduCasPage from './admin/CampaignProductsPage';
import OrderDetailsPage from './admin/OrderDetails';
import CampaignOrdersPage from './admin/OrdersCampaign';
import UserDetailsPage from './admin/UserDetailsPage';
import CampaignForm from './admin/CampaignForm';
import ProductForm from './admin/ProductForm';
import OrdersListPage from './admin/OrdersListPage';
import ProductList from './admin/ProductList';
import UsersPage from './admin/Customers';
import Dashboard from './admin/dashboard';
import Campaign from './pages/Campaign';
import CreateUserPage from './admin/CreateUserPage';
import ShareTargetPage from './components/ShareTargetPage';
import './output.css';
import { FilterProvider } from '@/context/FilterContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import ImageUpload from './admin/ImageUpload';
import Images from './pages/Images';
import FeedbackPage from './pages/Feedback';
import AdminFeedbackPage from './admin/AdminFeedback';

function AppContent() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'navigate' && event.data.url) {
        console.log('Mensagem recebida no AppContent:', event.data.url);
        const relativeUrl = event.data.url.replace(window.location.origin, '');
        navigate(relativeUrl);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, [navigate]);

  if (loading) return <div>Carregando...</div>;

  return (
    <>
      <Routes>
        {/* Users routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/pedido/:orderId" element={<OrderDetails />} />
        <Route path="/meus-pedidos" element={<Layout><OrdersList /></Layout>} />
        <Route path="/produto/:productId" element={<Layout><ProductDetails /></Layout>} />
        <Route path="/campanha/:id" element={<Layout><Campaign /></Layout>} />
        <Route path="/fotos" element={<Layout><Images /></Layout>} />
        <Route path="/feedback" element={<Layout><FeedbackPage /></Layout>} />

        {/* Admins routes */}
        <Route path="/admin/campanhas" element={<AdminLayout><Campanhas /></AdminLayout>} />
        <Route path="/admin" element={<AdminLayout><Dashboard /></AdminLayout>} />
        <Route path="/admin/campanha/:id" element={<AdminLayout><CampaignProduCasPage /></AdminLayout>} />
        <Route path="/admin/pedidos/:id" element={<AdminLayout><OrderDetailsPage /></AdminLayout>} />
        <Route path="/admin/campanha/:id/pedidos" element={<AdminLayout><CampaignOrdersPage /></AdminLayout>} />
        <Route path="/admin/clientes" element={<AdminLayout><UsersPage /></AdminLayout>} />
        <Route path="/admin/clientes/:userId" element={<AdminLayout><UserDetailsPage /></AdminLayout>} />
        <Route path="/admin/clientes/novo" element={<AdminLayout><CreateUserPage /></AdminLayout>} />
        <Route path="/admin/criar-campanha" element={<AdminLayout><CampaignForm /></AdminLayout>} />
        <Route path="/admin/cadastrar-produto/:campaignId" element={<AdminLayout><ProductForm /></AdminLayout>} />
        <Route path="/admin/cadastrar-produto" element={<AdminLayout><ProductForm /></AdminLayout>} />
        <Route path="/admin/share-target" element={<AdminLayout><ShareTargetPage /></AdminLayout>} />
        <Route path="/admin/lista-de-pedidos/" element={<AdminLayout><OrdersListPage /></AdminLayout>} />
        <Route path="/admin/lista-de-produtos/" element={<AdminLayout><ProductList /></AdminLayout>} />
        <Route path="/admin/upload-imagens" element={<AdminLayout><ImageUpload /></AdminLayout>} />
        <Route path="/admin/feedbacks" element={<AdminLayout><AdminFeedbackPage /></AdminLayout>} />
      </Routes>
      <Toaster />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <FilterProvider>
          <AppContent />
        </FilterProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;