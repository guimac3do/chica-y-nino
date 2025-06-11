<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Illuminate\Support\Facades\Validator;


class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::where('role', 'cliente')
            ->select(
                'users.*',
                DB::raw('(SELECT COUNT(*) FROM orders WHERE orders.id_cliente = users.id) as total_orders'),
                DB::raw('(
                    SELECT COALESCE(SUM(op.quantidade * p.preco), 0)
                    FROM orders o
                    JOIN order_product op ON o.id = op.order_id
                    JOIN products p ON op.product_id = p.id
                    WHERE o.id_cliente = users.id
                ) as total_spent')
            );

        // Apply search filter
        if ($request->has('search')) {
            $searchTerm = $request->search;
            $query->where(function($q) use ($searchTerm) {
                $q->where('name', 'LIKE', "%{$searchTerm}%")
                  ->orWhere('telefone', 'LIKE', "%{$searchTerm}%");
            });
        }

        // Apply date filters
        if ($request->has('date_from')) {
            $query->where('created_at', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->where('created_at', '<=', $request->date_to);
        }

        $users = $query->paginate(10);

        return response()->json($users);
    }

    public function show(User $user)
{
    $totalOrders = DB::table('orders')
        ->where('id_cliente', $user->id)
        ->count();

    $totalSpent = DB::table('orders')
        ->join('order_product', 'orders.id', '=', 'order_product.order_id')
        ->join('products', 'order_product.product_id', '=', 'products.id')
        ->where('orders.id_cliente', $user->id)
        ->select(DB::raw('SUM(order_product.quantidade * products.preco) as total'))
        ->first()
        ->total ?? 0;

    return response()->json([
        'id' => $user->id,
        'name' => $user->name,
        'telefone' => $user->telefone,
        'email' => $user->email,
        'cpf' => $user->cpf, // Adicionado aqui
        'created_at' => $user->created_at,
        'total_orders' => $totalOrders,
        'total_spent' => $totalSpent
    ]);
}

    public function orders(Request $request, User $user)
    {
        $query = DB::table('orders')
            ->join('order_product', 'orders.id', '=', 'order_product.order_id')
            ->join('products', 'order_product.product_id', '=', 'products.id')
            ->where('orders.id_cliente', $user->id)
            ->select(
                'orders.id',
                'orders.created_at',
                'orders.observacoes',
                DB::raw('SUM(order_product.quantidade * products.preco) as total')
            )
            ->groupBy('orders.id', 'orders.created_at', 'orders.observacoes');

        // Aplicar filtros de data
        if ($request->has('date_from')) {
            $query->where('orders.created_at', '>=', Carbon::parse($request->date_from)->startOfDay());
        }

        if ($request->has('date_to')) {
            $query->where('orders.created_at', '<=', Carbon::parse($request->date_to)->endOfDay());
        }

        // Aplicar filtros de valor
        if ($request->has('min_value')) {
            $query->having('total', '>=', $request->min_value);
        }

        if ($request->has('max_value')) {
            $query->having('total', '<=', $request->max_value);
        }

        $orders = $query->get();

        // Buscar produtos para cada pedido
        $ordersWithProducts = $orders->map(function ($order) {
            $products = DB::table('order_product')
                ->join('products', 'order_product.product_id', '=', 'products.id')
                ->where('order_product.order_id', $order->id)
                ->select(
                    'products.id',
                    'products.nome',
                    'order_product.quantidade',
                    'products.preco',
                    'order_product.status_pagamento',
                    'order_product.status_estoque'
                )
                ->get();

            return [
                'id' => $order->id,
                'created_at' => $order->created_at,
                'observacoes' => $order->observacoes,
                'total' => $order->total,
                'products' => $products
            ];
        });

        return response()->json($ordersWithProducts);
    }

    public function update(Request $request, User $user)
    {
        // Validação dos dados
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'cpf' => 'nullable|string|max:14',
            'telefone' => 'nullable|string|max:15',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Atualiza apenas os campos permitidos
        $user->update([
            'name' => $request->name,
            'cpf' => $request->cpf,
            'telefone' => $request->telefone,
        ]);

        return response()->json([
            'message' => 'User updated successfully',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'cpf' => $user->cpf,
                'telefone' => $user->telefone,
                'total_orders' => $user->total_orders, // Mantém os valores calculados
                'total_spent' => $user->total_spent,
            ]
        ], 200);
    }
}