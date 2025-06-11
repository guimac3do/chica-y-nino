<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\Campaign;
use App\Models\ProductColor;
use App\Models\ProductSize;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

class ProductListController extends Controller
{
    public function index()
    {
        $products = Product::with([
            'campaign:id,nome,marca',
            'productSizes:id,product_id,size,price',
            'orderProducts:id,product_id,quantidade',
        ])->get()->map(function ($product) {
            $colorIds = is_array($product->colors) ? array_map('intval', $product->colors) : [];
            $colorNames = ProductColor::whereIn('id', $colorIds)->pluck('name')->toArray();                      
        
            // Buscar os nomes das cores usando os IDs
            $colorNames = ProductColor::whereIn('id', $colorIds)->pluck('name')->toArray();
        
            return [
                'id' => $product->id,
                'nome' => $product->nome,
                'campaign' => [
                    'nome' => $product->campaign->nome ?? 'N/A',
                    'marca' => $product->campaign->marca ?? 'N/A',
                ],
                'colors' => $colorNames, // Agora retorna os nomes corretamente
                'sizes' => $product->productSizes->map(function ($size) {
                    return [
                        'size' => $size->size,
                        'price' => $size->price,
                    ];
                }),
                'sales' => $product->orderProducts->sum('quantidade'),
                'images' => is_string($product->images) ? json_decode($product->images, true) : $product->images,
            ];
        });        
        
    
        return response()->json($products);
    }
    
}