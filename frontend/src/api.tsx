import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8002/api',
});

async function fetchProducts() {
  try {
    const response = await api.get('/products');
    console.log(response.data);
  } catch (error) {
    console.error('Erro ao conectar com a API:', error);
  }
}

fetchProducts();

export default api;