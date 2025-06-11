<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\Campaign;
use Illuminate\Support\Facades\DB;

class OrderListController extends Controller
{
    public function index(Request $request)
    {
        $query = Order::query()
            ->select([
                'orders.id',
                'orders.id_cliente',
                'orders.telefone',
                'orders.created_at as data_pedido',
                DB::raw('COUNT(DISTINCT order_product.id) as quantidade_produtos'), // Evita contar duplicatas
                DB::raw('SUM(order_product.quantidade * product_sizes.price) as total'),
                'campaigns.id as campaign_id',
                'campaigns.nome as campaign_name',
                'campaigns.data_inicio as campaign_start',
                'campaigns.data_fim as campaign_end',
                DB::raw('CASE 
                    WHEN COUNT(CASE WHEN order_product.status_pagamento = "pendente" THEN 1 END) > 0 
                    THEN "pendente" 
                    ELSE "pago" 
                    END as status_pagamento')
            ])
            ->leftJoin('order_product', 'orders.id', '=', 'order_product.order_id')
            ->leftJoin('product_sizes', 'order_product.product_size_id', '=', 'product_sizes.id')
            ->leftJoin('products', 'product_sizes.product_id', '=', 'products.id')
            ->leftJoin('campaigns', 'products.campaign_id', '=', 'campaigns.id')
            ->leftJoin('users', 'orders.id_cliente', '=', 'users.id');

        // Apply date filters on data_pedido (orders.created_at)
        if ($request->has('start_date') && $request->start_date) {
            $query->whereDate('orders.created_at', '>=', $request->start_date);
        }
        if ($request->has('end_date') && $request->end_date) {
            $query->whereDate('orders.created_at', '<=', $request->end_date);
        }

        // Apply campaign filter by ID if provided
        if ($request->has('campaign_id') && $request->campaign_id !== 'todas') {
            $query->where('campaigns.id', $request->campaign_id);
        }

        // Group by order details to avoid duplication
        $query->groupBy(
            'orders.id',
            'orders.id_cliente',
            'orders.telefone',
            'orders.created_at',
            'campaigns.id',
            'campaigns.nome',
            'campaigns.data_inicio',
            'campaigns.data_fim'
        );

        $orders = $query->get()->map(function ($order) {
            return [
                'id' => $order->id,
                'cliente_nome' => DB::table('users')->where('id', $order->id_cliente)->value('name') ?? 'Desconhecido',
                'cliente_cpf' => DB::table('users')->where('id', $order->id_cliente)->value('cpf') ?? 'Não informado',
                'cliente_telefone' => $order->telefone ?? 'Não informado',
                'data_pedido' => $order->data_pedido,
                'campaign_id' => $order->campaign_id,
                'campaign_name' => $order->campaign_name ?? 'Sem campanha',
                'campaign_start' => $order->campaign_start,
                'campaign_end' => $order->campaign_end,
                'quantidade_produtos' => $order->quantidade_produtos,
                'total' => number_format($order->total ?? 0, 2, '.', ''),
                'status_pagamento' => $order->status_pagamento
            ];
        });

        // Remover duplicatas manuais baseadas no ID do pedido
        $uniqueOrders = $orders->unique('id')->values();

        return response()->json($uniqueOrders);
    }

    public function campaigns()
    {
        $campaigns = Campaign::select('id', 'nome')->get();
        return response()->json($campaigns);
    }
}