type product = {
  id: number;
  nome: string;
  imagens: any;
  preco: number;
  descricao: string;
};

type ProductCardProps = {
  product: product;
};

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const handleComprar = () => {
    // Pode ser uma chamada para o carrinho ou redirecionamento direto
    // Exemplo: redireciona para o WhatsApp com os detalhes do produto
    const message = encodeURIComponent(`Olá, tenho interesse no produto: ${product.nome}`);
    window.location.href = `https://wa.me/5511999999999?text=${message}`;
  };

  return (
    <div onClick={handleComprar} className="product-card cursor-pointer">
      <h3>{product.nome}</h3> 
      <p>Preço: R$ {product.preco.toFixed(2)}</p>
      {product.imagens && JSON.parse(product.imagens).map((imagem:any, index:any) => (
              <img key={index} src={`http://localhost:8002/api/storage/app/public/${imagem}`} alt={product.nome} width="150" />
            ))}
    </div>
  );
};

export default ProductCard;