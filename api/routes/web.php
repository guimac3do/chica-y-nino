<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\OrderController;
use Illuminate\Support\Facades\Response;


Route::get('/', function () {
    return ['Laravel' => app()->version()];
});

Route::get('/test-file', function () {
    $filePath = storage_path('app/public/products/67d364d969189.webp');
    return response()->file($filePath);
});

Route::get('/storage/{path}', function ($path) {
    // Remove o prefixo "app/public/" do $path, se presente
    $cleanPath = preg_replace('#^app/public/#', '', $path);
    $filePath = storage_path('app/public/' . $cleanPath);
    
    \Illuminate\Support\Facades\Log::info('Tentando acessar arquivo:', [
        'original_path' => $path,
        'clean_path' => $cleanPath,
        'full_path' => $filePath,
        'exists' => file_exists($filePath),
    ]);

    if (!file_exists($filePath)) {
        \Illuminate\Support\Facades\Log::warning('Arquivo não encontrado:', ['path' => $filePath]);
        abort(404, 'Arquivo não encontrado');
    }

    $mimeType = mime_content_type($filePath);
    return response()->file($filePath, [
        'Content-Type' => $mimeType,
        'Content-Disposition' => 'inline',
    ]);
})->where('path', '.*');

// Produtos
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{id}', [ProductController::class, 'show']);

// Pedidos
Route::post('/orders', [OrderController::class, 'store']);

require __DIR__.'/auth.php';
