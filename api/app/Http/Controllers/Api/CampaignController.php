<?php
namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\Campaign;
use App\Models\Product;
use App\Models\Order;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;


class CampaignController extends Controller
{
    public function index()
    {
        $campanhas = Campaign::with('brand')->get(); // Certifique-se de carregar a marca
        return response()->json($campanhas);
    }

    public function indexStore()
    {
        $campanhas = Campaign::with('brand')
        ->where(function ($query) {
            $now = Carbon::now();
            $query->where('data_inicio', '<=', $now)
                  ->where('data_fim', '>=', $now);
        })
        ->get();
        return response()->json($campanhas);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nome' => 'required|string',
            'gender_id' => 'required|integer|in:1,2',
            'marca' => 'required|string',
            'data_inicio' => 'required|date',
            'data_fim' => 'required|date|after_or_equal:data_inicio',
        ]);

        $baseName = $request->nome;
        $nome = $baseName;
        $counter = 1;

        // Keep checking until we find a unique name
        while (Campaign::where('nome', $nome)->exists()) {
            $nome = $baseName . " - " . $counter;
            $counter++;
        }

        // Create campaign with the unique name
        $campanha = Campaign::create([
            ...$request->except('nome'),
            'nome' => $nome
        ]);

        return response()->json($campanha, 201);
    }

    public function getBrands()
    {
        $brands = Brand::all();
        return response()->json($brands);
    }

    public function show($id) {
        $campaign = Campaign::findOrFail($id);
        $campaign->status = $campaign->status ?? 'not_started';
        return response()->json($campaign);
    }

    public function getProducts($id) {
        $products = Product::where('campaign_id', $id)
            ->with('brand')
            ->get();
        return response()->json($products);
    }

    public function getOrdersData($id)
    {
        // Verifica se a campanha existe
        $campaign = Campaign::findOrFail($id);

        // Obtém os IDs dos produtos da campanha
        $productIds = Product::where('campaign_id', $id)->pluck('id');

        // Obtém o total de pedidos dentro da campanha
        $totalOrders = Order::whereHas('products', function ($query) use ($productIds) {
            $query->whereIn('product_id', $productIds);
        })->count();

        // Obtém a quantidade de pedidos por produto
        $ordersByProduct = Order::join('order_product', 'orders.id', '=', 'order_product.order_id')
            ->whereIn('order_product.product_id', $productIds)
            ->groupBy('order_product.product_id')
            ->selectRaw('order_product.product_id, COUNT(order_product.order_id) as total')
            ->pluck('total', 'product_id');

        return response()->json([
            'total_orders' => $totalOrders,
            'orders_by_product' => $ordersByProduct
        ]);
    }

    public function update(Request $request, $id)
    {
        $campaign = Campaign::findOrFail($id);

        $request->validate([
            'nome' => 'required|string',
            'gender_id' => 'required|integer|in:1,2',
            'marca' => 'required|string',
            'data_inicio' => 'required|date',
            'data_fim' => 'required|date|after_or_equal:data_inicio',
        ]);

        $baseName = $request->nome;
        $nome = $baseName;
        $counter = 1;

        while (Campaign::where('nome', $nome)->where('id', '!=', $id)->exists()) {
            $nome = $baseName . " - " . $counter;
            $counter++;
        }

        $updated = $campaign->update([
            'nome' => $nome,
            'gender_id' => $request->gender_id,
            'marca' => $request->marca,
            'data_inicio' => $request->data_inicio,
            'data_fim' => $request->data_fim,
        ]);

        return response()->json($campaign, 200);
    }
}
