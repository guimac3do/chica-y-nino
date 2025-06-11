<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\CampaignController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\ProductColorController;
use App\Http\Controllers\Api\OrderListController;
use App\Http\Controllers\Api\ProductListController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ImageController;
use App\Http\Controllers\Api\FeedbackController;
use App\Http\Controllers\Api\AdminFeedbackController;
use App\Http\Controllers\Api\ProductScraperController;


Route::middleware(['auth:sanctum'])->get('/user', function (Request $request) {
    return $request->user();
});

Route::get('/storage/{path}', function ($path) {
    $cleanPath = preg_replace('#^app/public/#', '', $path);
    $filePath = storage_path('app/public/' . $cleanPath);
    

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

// Login e cadastro
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/users', [UserController::class, 'index']);
});

// Campanhas
Route::get('/campanhas', [CampaignController::class, 'index']);
Route::put('/campanhas/{id}', [CampaignController::class, 'update']);
Route::get('/campanhasStore', [CampaignController::class, 'indexStore']);
Route::get('/campanhas/{id}', [CampaignController::class, 'show']);
Route::get('/campanhas/{id}/produtos', [CampaignController::class, 'getProducts']);
Route::get('/campanhas/{id}/pedidos', [CampaignController::class, 'getOrdersData']);
Route::get('/campanha/{id}/pedidos', [OrderController::class, 'getOrdersByCampaign']);
Route::post('/criar-campanha', [CampaignController::class, 'store']);
Route::get('/brands', [CampaignController::class, 'getBrands']);

// Imagens Feedbacks
Route::post('/images', [ImageController::class, 'store']);
Route::get('/images', [ImageController::class, 'index']);
Route::delete('/images/{id}', [ImageController::class, 'destroy']);

// Clientes
Route::prefix('users')->group(function () {
    Route::get('/', [UserController::class, 'index']);
    Route::get('/{user}', [UserController::class, 'show']);
    Route::get('/{user}/pedidos', [UserController::class, 'orders']);
    Route::put('/{user}', [UserController::class, 'update']);
});

// Rotas de produtos
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/all', [ProductController::class, 'indexAll']); // Novo endpoint para todos os produtos
Route::post('/products', [ProductController::class, 'store']);
Route::get('/products/campanhas', [ProductController::class, 'getCampanhas']);
Route::get('/products/{id}', [ProductController::class, 'show']);
Route::get('/products/all/{id}', [ProductController::class, 'showAll']); // Qualquer produto por ID
Route::delete('/products/{id}', [ProductController::class, 'destroy']);
Route::put('/products/{id}', [ProductController::class, 'update']);
Route::get('/product-colors', [ProductColorController::class, 'index']);
Route::post('/products/scrape', [ProductScraperController::class, 'scrape']);

// Rotas de cores de produtos
Route::apiResource('product-colors', ProductColorController::class);

//pedidos
Route::get('/pedidos/{id}', [OrderController::class, 'getOrderDetails']);
    Route::get('/orders', [OrderListController::class, 'index']);
    Route::get('/campaigns', [OrderListController::class, 'campaigns']);
Route::post('/notificar-pagamento', [OrderController::class, 'notificarPagamento']);
Route::post('/marcar-processados', [OrderController::class, 'marcarComoProcessado']);
Route::post('/salvar-imagem', [OrderController::class, 'salvarImagemGerada']);
Route::get('/imagens-geradas', [OrderController::class, 'listarImagensGeradas']);
Route::get('/orders/sales-by-campaign/{campaignId}', [OrderController::class, 'getSalesByCampaign']);
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/order', [OrderController::class, 'createOrder']);
});

// Atualizar status dos pedidos
Route::put('/pedidos/{orderId}/produtos/{productId}/status', [OrderController::class, 'updateStatus']);

Route::get('/campanhas/{id}/vendas', [OrderController::class, 'getSalesByCampaign']);

// Lista de pedidos
Route::get('/products/filter-options', [ProductListController::class, 'getFilterOptions']);
Route::get('/products/sales', [ProductListController::class, 'getSalesData']);

// Marcas
Route::get('/marcas', [BrandController::class, 'index']);
Route::post('/marcas', [BrandController::class, 'store']);

// Produtos
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/campanhaId={id}', [ProductController::class, 'index']);
Route::post('/products', [ProductController::class, 'store']);
Route::get('/products/{id}', [ProductController::class, 'show']);

// Carrinho
Route::middleware('auth:sanctum')->group(function () {
    Route::delete('/cart/remove', [CartController::class, 'removeFromCart']);
    Route::put('/cart/update', [CartController::class, 'updateCartItem']);
    Route::post('/cart/add', [CartController::class, 'addToCart']);
    Route::get('/cart', [CartController::class, 'getCart']);
    Route::delete('/cart/clear', [CartController::class, 'clearCart']);
});

// Pedidos front-end
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me-products', [OrderController::class, 'getUser']);
    Route::get('/orders-user-list', [OrderController::class, 'getUserOrders']);
    Route::post('/orders/{orderId}/cancel', [OrderController::class, 'cancelOrder']);
    Route::post('/orders/{orderId}/items/{itemId}/cancel', [OrderController::class, 'cancelOrderItem']);
    Route::post('/orders', [OrderController::class, 'createOrder']);
    // Outras rotas existentes
});
Route::get('/orders-user/{orderId}', [OrderController::class, 'getOrderDetailsUser']); // Público

//Feedbacks
    // User routes
    Route::middleware('auth:sanctum')->group(function () {
    Route::get('/feedbacks', [FeedbackController::class, 'index']);
    Route::post('/feedbacks', [FeedbackController::class, 'store']);
    Route::put('/feedbacks/{id}', [FeedbackController::class, 'update']);
    Route::get('/my-feedback', [FeedbackController::class, 'showUserFeedback']);
    });

    // Admin routes
    Route::get('/admin/feedbacks', [AdminFeedbackController::class, 'index']);
    Route::post('/admin/feedbacks/{id}/approve', [AdminFeedbackController::class, 'approve']);
    
    // Produtos recomendados
    Route::get('/products/recommended/{genderId}', [ProductController::class, 'getRecommendedByGender']);
    

// PWA
Route::post('/admin/share-target', function (Request $request) {
    Log::info('Request bruto recebido em /admin/share-target:', [
        'headers' => $request->headers->all(),
        'files' => $request->allFiles(),
        'input' => $request->all(),
    ]);

    $images = $request->allFiles();
    $imageUrls = [];

    if (empty($images)) {
        Log::warning('Nenhum arquivo recebido em $request->allFiles()');
    } else {
        $imageFiles = [];
        foreach ($images as $key => $file) {
            if (is_array($file)) {
                $imageFiles = array_merge($imageFiles, $file);
            } else {
                $imageFiles[] = $file;
            }
        }

        foreach ($imageFiles as $index => $image) {
            if ($image instanceof \Illuminate\Http\UploadedFile) {
                $path = $image->store('temp', 'public');
                $fullUrl = url('/api/storage/app/public/' . $path);
                $imageUrls[] = $fullUrl;
                Log::info("Imagem $index processada:", [
                    'path' => $path,
                    'full_url' => $fullUrl,
                    'file_exists' => file_exists(storage_path('app/public/' . $path)),
                ]);
            }
        }
    }

    $redirectUrl = 'https://loja.chicaynino.com.br/admin/cadastrar-produto?images=' . urlencode(json_encode($imageUrls));
    Log::info('Redirecionando para:', ['url' => $redirectUrl]);

    return response($redirectUrl, 200, ['Content-Type' => 'text/plain']);
})->name('share-target');
/*
/*
Route::post('/login', function (Request $request) {
    $credentials = $request->validate([
        'email' => 'required|email',
        'password' => 'required',
    ]);

    if (!Auth::attempt($credentials)) {
        return response()->json(['message' => 'Credenciais inválidas'], 401);
    }

    $user = Auth::user();
    $token = $user->createToken('auth_token')->plainTextToken;

    return response()->json(['token' => $token, 'user' => $user]);
});

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return response()->json($request->user());
});

Route::middleware('auth:sanctum')->post('/logout', function (Request $request) {
    $request->user()->tokens()->delete();
    return response()->json(['message' => 'Deslogado com sucesso']);
});
*/