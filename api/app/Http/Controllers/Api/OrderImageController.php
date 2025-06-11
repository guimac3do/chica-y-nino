<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class OrderImageController extends Controller
{
    public function store(Request $request, Order $order)
    {
        $request->validate([
            'image' => 'required|string', // Base64 da imagem
            'processed_products' => 'required|array',
            'processed_products.*' => 'integer'
        ]);

        // Salvar a imagem
        $image_data = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $request->image));
        $filename = 'orders/' . $order->id . '/processed_' . time() . '.png';
        Storage::disk('public')->put($filename, $image_data);

        // Criar registro da imagem
        $orderImage = OrderImage::create([
            'order_id' => $order->id,
            'image_path' => $filename
        ]);

        // Marcar produtos como processados
        $order->produtos()
            ->whereIn('id', $request->processed_products)
            ->update([
                'is_processed' => true,
                'processed_at' => now()
            ]);

        return response()->json([
            'message' => 'Imagem salva com sucesso',
            'image_url' => Storage::url($filename)
        ]);
    }

    public function index(Order $order)
    {
        $images = OrderImage::where('order_id', $order->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($image) {
                return [
                    'id' => $image->id,
                    'url' => Storage::url($image->image_path),
                    'created_at' => $image->created_at
                ];
            });

        return response()->json($images);
    }
}