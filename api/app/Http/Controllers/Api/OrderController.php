<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Order;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use App\Models\GeneratedImage;
use App\Models\Product; 
use Illuminate\Support\Facades\Cache;
use App\Models\OrderProduct;



class OrderController extends Controller
{
    public function store(Request $request)
    {
        $order = Order::create([
            'nome_cliente' => 'João Silva',
            'telefone' => '11999999999',
            'observacoes' => 'Entrega rápida',
        ]);
        
        $produtos = [1 => 2, 3 => 1]; 
        
        foreach ($produtos as $productId => $quantidade) {
            $order->products()->attach($productId, ['quantidade' => $quantidade]);
        }
    }

public function createOrder(Request $request)
{
    $request->validate([
        'items' => 'required|array',
        'items.*.product_id' => 'required|integer|exists:products,id',
        'items.*.product_size_id' => 'required|integer|exists:product_color_sizes,id', // Ajustado
        'items.*.quantidade' => 'required|integer|min:1',
        'items.*.cor' => 'nullable|string|max:255',
        'observacoes' => 'nullable|string',
        'telefone' => 'required|string|max:20',
    ]);

    $user = $request->user();

    DB::beginTransaction();
    try {
        $order = Order::create([
            'id_cliente' => $user->id,
            'telefone' => $request->telefone,
            'observacoes' => $request->observacoes,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach ($request->items as $item) {
            OrderProduct::create([
                'order_id' => $order->id,
                'product_id' => $item['product_id'],
                'product_size_id' => $item['product_size_id'],
                'quantidade' => $item['quantidade'],
                'cor' => $item['cor'] ?? null,
                'status_pagamento' => 'pendente',
                'status_estoque' => 'pendente',
                'is_processed' => false,
            ]);
        }

        DB::commit();
        return response()->json(['message' => 'Pedido criado com sucesso', 'order_id' => $order->id]);
    } catch (\Exception $e) {
        DB::rollBack();
        \Log::error('Erro ao criar pedido:', ['error' => $e->getMessage()]);
        return response()->json(['message' => 'Erro ao criar pedido: ' . $e->getMessage()], 500);
    }
}

    public function getOrderDetails($id)
    {
        $order = Order::with('cliente')->find($id);
        if (!$order) {
            return response()->json(['message' => 'Pedido não encontrado'], 404);
        }
    
        $orderProducts = OrderProduct::where('order_id', $id)
            ->with(['product', 'productSize'])
            ->get();
    
        return response()->json([
            'id' => $order->id,
            'cliente' => [
                'id' => $order->cliente->id ?? null,
                'nome' => $order->cliente->name ?? 'Desconhecido',
                'cpf' => $order->cliente->cpf ?? 'Não informado',
                'telefone' => $order->telefone
            ],
            'observacoes' => $order->observacoes,
            'notificacoes_enviadas' => $order->notificacoes_enviadas ?? 0, // Adicionado ao nível do pedido
            'produtos' => $orderProducts->map(function ($orderProduct) {
                $jsonImages = is_array($orderProduct->product->images) ? $orderProduct->product->images : json_decode($orderProduct->product->images, true);
                return [
                    'id' => $orderProduct->id,
                    'nome' => $orderProduct->product->nome,
                    'preco' => $orderProduct->productSize->price ?? '0.00',
                    'quantidade' => $orderProduct->quantidade,
                    'tamanho' => $orderProduct->productSize->size ?? 'Não especificado',
                    'cor' => $orderProduct->cor ?? 'Não especificada',
                    'status_pagamento' => $orderProduct->status_pagamento ?? 'pendente',
                    'status_estoque' => $orderProduct->status_estoque ?? 'pendente',
                    'processado' => $orderProduct->processado ?? false,
                    'images' => array_merge(
                        is_array($jsonImages) ? $jsonImages : []
                    ),
                ];
            }),
            'created_at' => $order->created_at->format('Y-m-d H:i:s')
        ]);
    }
    
    public function notificarPagamento(Request $request)
    {
        $orderId = $request->input('order_id'); // Alterado de produto_id para order_id
        $order = Order::findOrFail($orderId);
    
        // Incrementa notificações no nível do pedido
        $order->increment('notificacoes_enviadas');
    
        return response()->json(['message' => 'Notificação registrada com sucesso']);
    }

public function marcarComoProcessado(Request $request)
{
    $produtosIds = $request->input('produtos', []);

    \DB::table('order_product')
        ->whereIn('id', $produtosIds)
        ->update(['processado' => true]);

    return response()->json(['message' => 'Produtos marcados como processados']);
}

public function salvarImagemGerada(Request $request)
{
    $imagem = $request->file('imagem');
    $caminho = $imagem->store('pedidos', 'public');

    // Salvar no banco de dados
    $imagemSalva = GeneratedImage::create(['path' => $caminho]);

    return response()->json([
        'message' => 'Imagem salva com sucesso!',
        'url' => asset("storage/$caminho"),
        'id' => $imagemSalva->id
    ]);
}

public function listarImagensGeradas()
{
    $imagens = GeneratedImage::orderBy('created_at', 'desc')->get();

    return response()->json($imagens);
}

public function getOrdersByCampaign($campaignId)
{
    // Buscar os IDs dos produtos que pertencem à campanha
    $productIds = Product::where('campaign_id', $campaignId)->pluck('id')->toArray();

    if (empty($productIds)) {
        return response()->json([]);
    }

    // Buscar os pedidos que contêm esses produtos na tabela order_product
    $orders = DB::table('orders')
        ->join('order_product', 'orders.id', '=', 'order_product.order_id')
        ->whereIn('order_product.product_id', $productIds)
        ->select(
            'orders.id',
            'orders.id_cliente',
            'orders.telefone',
            'orders.created_at as data_pedido',
            DB::raw('SUM(order_product.quantidade) as quantidade_produtos'),
            DB::raw('(SELECT SUM(order_product.quantidade * products.preco) 
                      FROM order_product 
                      JOIN products ON order_product.product_id = products.id 
                      WHERE order_product.order_id = orders.id) as total')
        )
        ->groupBy('orders.id', 'orders.id_cliente', 'orders.telefone', 'orders.created_at')
        ->get();

    // Substituir a busca pelo nome do cliente na tabela users
    $formattedOrders = $orders->map(function ($order) {
        return [
            'id' => $order->id,
            'total' => $order->total ? number_format($order->total, 2, '.', '') : '0.00',
            'cliente_nome' => DB::table('users')->where('id', $order->id_cliente)->value('name') ?? 'Desconhecido',
            'cliente_telefone' => $order->telefone ?? 'Não informado',
            'data_pedido' => date('Y-m-d', strtotime($order->data_pedido)),
            'quantidade_produtos' => $order->quantidade_produtos
        ];
    });

    return response()->json($formattedOrders);
}

public function updateStatus(Request $request, $orderId, $orderProductId)
{
    $request->validate([
        'status_pagamento' => 'nullable|in:pendente,pago,cancelado',
        'status_estoque' => 'nullable|in:pendente,chegou',
    ]);

    // Buscar o registro específico na tabela order_product
    $orderProduct = OrderProduct::where('order_id', $orderId)
        ->where('id', $orderProductId) // Usar o id do order_product
        ->firstOrFail();

    // Atualizar os campos enviados
    $orderProduct->update(array_filter([
        'status_pagamento' => $request->status_pagamento,
        'status_estoque' => $request->status_estoque,
    ]));

    return response()->json(['message' => 'Status atualizado com sucesso']);
}

public function getSalesByCampaign($campaignId)
{
    $sales = DB::table('order_product')
        ->join('products', 'order_product.product_id', '=', 'products.id')
        ->join('campaigns', 'products.campaign_id', '=', 'campaigns.id')
        ->where('campaigns.id', $campaignId)
        ->select('products.id', DB::raw('SUM(order_product.quantidade) as total_vendas'))
        ->groupBy('products.id')
        ->pluck('total_vendas', 'products.id');

    return response()->json($sales);
}

public function getUserOrders(Request $request)
{
    $user = $request->user();
    $orders = Order::with(['items.product', 'items.productSize']) // Adicionei 'items.productSize' para garantir o preço
        ->where('id_cliente', $user->id)
        ->get()
        ->map(function ($order) {
            $order->total = $order->items->sum(function ($item) {
                return $item->productSize->price * $item->quantidade;
            });
            $order->total_quantidade = $order->items->sum('quantidade'); // Nova propriedade para soma das quantidades
            $order->items->transform(function ($item) {
                return [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'product_name' => $item->product->nome,
                    'product_size' => $item->productSize->size,
                    'quantidade' => $item->quantidade,
                    'cor' => $item->cor,
                    'status_pagamento' => $item->status_pagamento,
                    'status_estoque' => $item->status_estoque,
                    'thumbnail' => $item->product->thumbnails[0] ?? null,
                ];
            });
            return $order;
        });
    return response()->json($orders);
}

public function getOrderDetailsUser($orderId)
{
    $order = Order::with(['items.product', 'items.productSize'])->findOrFail($orderId);

    $formattedOrder = [
        'id' => $order->id,
        'id_cliente' => $order->id_cliente,
        'telefone' => $order->telefone,
        'observacoes' => $order->observacoes,
        'created_at' => $order->created_at->toDateTimeString(),
        'updated_at' => $order->updated_at->toDateTimeString(),
        'total' => $order->items->sum(function ($item) {
            return ($item->productSize ? $item->productSize->price : 0) * $item->quantidade;
        }),
        'status_pagamento' => $order->items->every(fn($item) => $item->status_pagamento === 'cancelado') ? 'cancelado' : 'pendente',
        'items' => $order->items->map(function ($item) {
            // Busca todas as imagens gerais do produto
            $productImages = is_array($item->product->images) ? $item->product->images : json_decode($item->product->images, true) ?? [];

            // Determina a imagem da cor
            $colorImage = null;
            if ($item->productSize && $item->productSize->product_color_id) {
                // Busca a imagem correspondente ao product_color_id em product_color_images
                $colorImage = $item->product->colorImages()
                    ->where('product_color_id', $item->productSize->product_color_id)
                    ->first()?->image_path;
            }

            // Fallback para a primeira imagem geral se não houver imagem específica
            $colorImage = $colorImage ?? $productImages[0] ?? null;

            return [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'product_name' => $item->product->nome,
                'product_size' => $item->productSize ? $item->productSize->size : 'Indisponível',
                'quantidade' => $item->quantidade,
                'cor' => $item->cor,
                'status_pagamento' => $item->status_pagamento,
                'status_estoque' => $item->status_estoque,
                'notificacoes_enviadas' => $item->notificacoes_enviadas,
                'is_processed' => $item->is_processed,
                'processed_at' => $item->processed_at,
                'images' => $productImages,
                'color_image' => $colorImage,
                'price' => $item->productSize ? $item->productSize->price : 0,
            ];
        })->all(),
    ];

    return response()->json($formattedOrder);
}
    public function cancelOrder(Request $request, $orderId)
    {
        $user = $request->user();
        $order = Order::where('id_cliente', $user->id)->findOrFail($orderId);

        DB::beginTransaction();
        try {
            // Atualiza todos os itens do pedido para "cancelado"
            $order->items()->update(['status_pagamento' => 'cancelado']);
            DB::commit();
            return response()->json(['message' => 'Pedido cancelado com sucesso']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Erro ao cancelar pedido: ' . $e->getMessage()], 500);
        }
    }

    public function cancelOrderItem(Request $request, $orderId, $itemId)
    {
        $user = $request->user();
        $order = Order::where('id_cliente', $user->id)->findOrFail($orderId);
        $item = OrderProduct::where('order_id', $order->id)->findOrFail($itemId);

        try {
            $item->status_pagamento = 'cancelado';
            $item->save();
            return response()->json(['message' => 'Item cancelado com sucesso']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Erro ao cancelar item: ' . $e->getMessage()], 500);
        }
    }

    public function getUser(Request $request)
    {
        return response()->json($request->user());
    }

}