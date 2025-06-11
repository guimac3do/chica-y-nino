<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\CartItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CartController extends Controller
{
public function addToCart(Request $request)
{
    $request->validate([
        'product_id' => 'required|exists:products,id',
        'product_size_id' => 'required|exists:product_color_sizes,id', // Ajustado
        'quantidade' => 'required|integer|min:1',
        'cor' => 'nullable|string|max:50',
    ]);

    $user = $request->user();
    
    try {
        DB::beginTransaction();

        $cart = Cart::firstOrCreate(['user_id' => $user->id]);

        $existingItem = CartItem::where('cart_id', $cart->id)
            ->where('product_id', $request->product_id)
            ->where('product_size_id', $request->product_size_id)
            ->where('cor', $request->cor)
            ->first();

        if ($existingItem) {
            $existingItem->update([
                'quantidade' => $existingItem->quantidade + $request->quantidade,
            ]);
        } else {
            CartItem::create([
                'cart_id' => $cart->id,
                'product_id' => $request->product_id,
                'product_size_id' => $request->product_size_id,
                'quantidade' => $request->quantidade,
                'cor' => $request->cor,
            ]);
        }

        DB::commit();

        return response()->json(['message' => 'Produto adicionado ao carrinho!'], 201);
    } catch (\Exception $e) {
        DB::rollBack();
        \Log::error('Erro ao adicionar ao carrinho:', ['error' => $e->getMessage()]);
        return response()->json(['message' => 'Erro ao adicionar ao carrinho: ' . $e->getMessage()], 500);
    }
}

public function getCart(Request $request)
{
    $user = $request->user();
    $cart = Cart::with(['items.product', 'items.productSize'])->where('user_id', $user->id)->first();

    if (!$cart) {
        return response()->json(['items' => [], 'total' => 0]);
    }

    $items = $cart->items->map(function ($item) {
        // Busca imagens gerais do produto
        $productImages = is_array($item->product->images) ? $item->product->images : json_decode($item->product->images, true) ?? [];

        // Determina a imagem da cor
        $colorImage = null;
        if ($item->productSize && $item->productSize->product_color_id) {
            $colorImage = $item->product->colorImages()
                ->where('product_color_id', $item->productSize->product_color_id)
                ->first()?->image_path;
        }
        $colorImage = $colorImage ?? $productImages[0] ?? null;

        return [
            'id' => $item->id,
            'product_id' => $item->product_id,
            'product_size_id' => $item->product_size_id, // Add this field
            'nome' => $item->product->nome,
            'size' => $item->productSize ? $item->productSize->size : 'Indisponível',
            'price' => $item->productSize ? $item->productSize->price : 0,
            'quantidade' => $item->quantidade,
            'cor' => $item->cor,
            'subtotal' => $item->productSize ? $item->productSize->price * $item->quantidade : 0,
            'color_image' => $colorImage, // Adiciona a imagem da cor
            'images' => $productImages,   // Mantém as imagens gerais como referência
        ];
    });

    $total = $items->sum('subtotal');

    return response()->json([
        'items' => $items->all(),
        'total' => $total,
    ]);
}

    public function removeFromCart(Request $request)
{
    $request->validate(['item_id' => 'required|integer|exists:cart_items,id']);
    $user = $request->user();
    $item = CartItem::where('id', $request->item_id)->whereHas('cart', function ($query) use ($user) {
        $query->where('user_id', $user->id);
    })->firstOrFail();
    $item->delete();
    return response()->json(['message' => 'Item removido do carrinho']);
}

public function updateCartItem(Request $request)
{
    $request->validate([
        'item_id' => 'required|integer|exists:cart_items,id',
        'quantidade' => 'required|integer|min:1',
    ]);
    $user = $request->user();
    $item = CartItem::where('id', $request->item_id)->whereHas('cart', function ($query) use ($user) {
        $query->where('user_id', $user->id);
    })->firstOrFail();
    $item->quantidade = $request->quantidade;
    $item->save();
    return response()->json(['message' => 'Quantidade atualizada']);
}

public function clearCart(Request $request)
    {
        $user = $request->user();
        CartItem::whereHas('cart', function ($query) use ($user) {
            $query->where('user_id', $user->id);
        })->delete();
        return response()->json(['message' => 'Carrinho limpo']);
    }
    
}