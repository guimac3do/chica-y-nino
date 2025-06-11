<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\Campaign;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Facades\Image;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;
use App\Models\ProductSize;
use App\Models\ProductColor;
use App\Models\ProductColorImage;
use App\Models\ProductColorSize;
use Illuminate\Support\Facades\Log;


class ProductController extends Controller
{

public function indexAll(Request $request)
    {
        Log::info('Iniciando ProductController@indexAll', [
            'request' => $request->all(),
        ]);

        $query = Product::with(['campaign', 'colorSizes', 'colorImages', 'productColors']);
        
        if ($request->has('campanhaId')) {
            $query->where('campaign_id', $request->campanhaId);
            Log::info('Filtrando por campanha', ['campanhaId' => $request->campanhaId]);
        }
    
        $products = $query->get();
        
        Log::info('Produtos retornados em indexAll', [
            'products_count' => $products->count(),
            'products' => $products->toArray(),
        ]);
    
        return response()->json($products);
    }

  public function store(Request $request)
{
    $request->validate([
        'nome' => 'required|string|max:255',
        'descricao' => 'nullable|string',
        'campaign_id' => 'required|exists:campaigns,id',
        'preco' => 'required|numeric',
        'images.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:4096',
        'colors' => 'required|array',
        'colors.*.id' => 'required|integer|exists:product_colors,id',
        'colors.*.sizes' => 'required|array',
        'colors.*.sizes.*.size' => 'required|string|max:50',
        'colors.*.sizes.*.price' => 'nullable|numeric|min:0',
        'color_images' => 'nullable|array',
        'color_images.*.color_id' => 'required_with:color_images|integer|exists:product_colors,id',
        'color_images.*.images.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:4096',
    ]);

    $imagePaths = [];
    $thumbnailPaths = [];

    // Processar imagens gerais do produto
    if ($request->hasFile('images')) {
        foreach ($request->file('images') as $image) {
            $imageName = uniqid() . '.webp';
            $imagePath = 'products/' . $imageName;
            $thumbPath = 'products/thumbnails/' . $imageName;

            $manager = new ImageManager(new Driver());
            $img = $manager->read($image->getPathname())->scale(width: 1000)->toWebp(90);
            Storage::disk('public')->put($imagePath, $img);

            $thumbnail = $manager->read($image->getPathname())->scale(width: 200, height: 200)->toWebp(50);
            Storage::disk('public')->put($thumbPath, $thumbnail);

            $imagePaths[] = $imagePath;
            $thumbnailPaths[] = $thumbPath;
        }
    }

    // Criar o produto
    $product = Product::create([
        'nome' => $request->nome,
        'descricao' => $request->descricao,
        'campaign_id' => $request->campaign_id,
        'preco' => $request->preco,
        'images' => $imagePaths,
        'thumbnails' => $thumbnailPaths,
        'colors' => array_column($request->colors, 'id'), // Apenas IDs das cores
    ]);

    // Associar tamanhos e preços por cor
    foreach ($request->colors as $colorData) {
        foreach ($colorData['sizes'] as $sizeData) {
            ProductColorSize::create([
                'product_id' => $product->id,
                'product_color_id' => $colorData['id'],
                'size' => $sizeData['size'],
                'price' => $sizeData['price'] ?? $request->preco, // Usa preço base se não especificado
            ]);
        }
    }

    // Processar imagens associadas a cores (opcional)
    if ($request->has('color_images')) {
        foreach ($request->input('color_images', []) as $index => $colorImageData) {
            $colorId = $colorImageData['color_id'];
            $colorImages = $request->file("color_images.{$index}.images") ?? [];

            foreach ($colorImages as $image) {
                $imageName = uniqid() . '.webp';
                $imagePath = 'products/color_images/' . $imageName;
                $thumbPath = 'products/color_thumbnails/' . $imageName;

                $manager = new ImageManager(new Driver());
                $img = $manager->read($image->getPathname())->scale(width: 1000)->toWebp(90);
                Storage::disk('public')->put($imagePath, $img);

                $thumbnail = $manager->read($image->getPathname())->scale(width: 200, height: 200)->toWebp(50);
                Storage::disk('public')->put($thumbPath, $thumbnail);

                ProductColorImage::create([
                    'product_id' => $product->id,
                    'product_color_id' => $colorId,
                    'image_path' => $imagePath,
                    'thumbnail_path' => $thumbPath,
                ]);
            }
        }
    }

    $product->load('colorSizes', 'colorImages');
    return response()->json(['message' => 'Produto criado com sucesso!', 'product' => $product], 201);
}


    // Retorna apenas os produtos com campanha ativa
public function index(Request $request)
    {
        Log::info('Iniciando ProductController@index', [
            'request' => $request->all(),
        ]);

        $query = Product::with(['campaign', 'colorSizes', 'colorImages', 'productColors']);
        
        if ($request->has('campanhaId')) {
            $query->where('campaign_id', $request->campanhaId);
            Log::info('Filtrando por campanha', ['campanhaId' => $request->campanhaId]);
        }
    
        $products = $query->get();
        
        Log::info('Produtos retornados em index', [
            'products_count' => $products->count(),
            'products' => $products->toArray(),
        ]);
    
        return response()->json($products);
    }

    public function show($id)
    {
        Log::info('Iniciando ProductController@show', ['product_id' => $id]);

        $product = Product::with(['campaign', 'colorSizes', 'colorImages', 'productColors'])->findOrFail($id);
        
        Log::info('Produto carregado em show', [
            'product' => $product->toArray(),
            'has_color_sizes' => !empty($product->colorSizes),
            'has_color_images' => !empty($product->colorImages),
            'has_product_colors' => !empty($product->productColors),
        ]);

        if (!$product->isAvailable()) {
            Log::warning('Produto indisponível', ['product_id' => $id]);
            return response()->json(['error' => 'Produto indisponível.'], 404);
        }
        
        return response()->json($product);
    }
    
    public function showAll($id)
    {
        Log::info('Iniciando ProductController@showAll', ['product_id' => $id]);

        $product = Product::with(['campaign', 'colorSizes', 'colorImages', 'productColors'])->findOrFail($id);
        
        Log::info('Produto carregado em showAll', [
            'product' => $product->toArray(),
            'has_color_sizes' => !empty($product->colorSizes),
            'has_color_images' => !empty($product->colorImages),
            'has_product_colors' => !empty($product->productColors),
        ]);

        return response()->json($product);
    }

public function update(Request $request, $id)
{
    Log::info("Iniciando atualização do produto", [
        'id' => $id,
        'request_all' => $request->all(),
        'request_input' => $request->input(),
        'request_files' => $request->file(),
        'content_type' => $request->header('Content-Type'),
        'method' => $request->method(),
    ]);

    $request->validate([
        'nome' => 'sometimes|required|string|max:255',
        'preco' => 'sometimes|required|numeric',
        'sizes' => 'sometimes|required|array',
        'sizes.*.id' => 'sometimes|nullable|numeric',
        'sizes.*.size' => 'required|string|max:255',
        'sizes.*.price' => 'required|numeric',
        'sizes.*.product_color_id' => 'nullable|numeric|exists:product_colors,id', // Tornar opcional
        'sizes.*.color_name' => 'nullable|string|max:255', // Adicionar para resolver novas cores
        'colors' => 'nullable|array',
        'colors.*' => 'string|max:255',
        'descricao' => 'nullable|string',
        'campaign_id' => 'sometimes|required|exists:campaigns,id',
        'images.*' => 'sometimes|image|mimes:jpeg,png,jpg,gif,webp|max:4096',
        'existing_images' => 'nullable|array',
        'existing_images.*' => 'string',
        'color_images' => 'nullable|array',
        'color_images.*.color_id' => 'required|numeric|exists:product_colors,id',
        'color_images.*.images.*' => 'sometimes|image|mimes:jpeg,png,jpg,gif,webp|max:4096',
        'existing_color_images' => 'nullable|array',
        'existing_color_images.*' => 'string',
    ]);

    $product = Product::findOrFail($id);
    Log::info("Produto encontrado", ['product' => $product->toArray()]);

    // Processar cores primeiro
    $colorsInput = $request->input('colors', $product->colors);
    $colorIds = [];
    $colorMap = []; // Mapear nome da cor para ID
    if (!empty($colorsInput)) {
        foreach ($colorsInput as $colorName) {
            $color = ProductColor::firstOrCreate(['name' => $colorName]);
            $colorIds[] = $color->id;
            $colorMap[$colorName] = $color->id;
        }
    }

    $productData = [
        'nome' => $request->input('nome', $product->nome),
        'preco' => $request->input('preco', $product->preco),
        'colors' => $colorIds,
        'descricao' => $request->input('descricao', $product->descricao),
        'campaign_id' => $request->input('campaign_id', $product->campaign_id),
    ];

    $updated = $product->update($productData);
    Log::info("Resultado da atualização", ['updated' => $updated, 'product' => $product->toArray()]);

    // Atualizar tamanhos
    if ($request->has('sizes')) {
        $newSizes = $request->input('sizes', []);
        $existingSizes = ProductColorSize::where('product_id', $product->id)->get()->keyBy('id');
        $existingSizeIds = $existingSizes->pluck('id')->toArray();
        $sentSizeIds = array_filter(array_column($newSizes, 'id'), fn($id) => !empty($id));

        foreach ($newSizes as $sizeData) {
            $productColorId = $sizeData['product_color_id'] ?? null;
            if (!$productColorId && isset($sizeData['color_name'])) {
                $productColorId = $colorMap[$sizeData['color_name']] ?? null;
            }

            if (isset($sizeData['id']) && $existingSizes->has($sizeData['id'])) {
                // Atualizar tamanho existente pelo ID
                $existingSizes[$sizeData['id']]->update([
                    'size' => $sizeData['size'],
                    'price' => $sizeData['price'],
                    'product_color_id' => $productColorId,
                ]);
            } else {
                // Tentar encontrar um tamanho existente pelo product_color_id e size
                $existingSize = ProductColorSize::where('product_id', $product->id)
                    ->where('product_color_id', $productColorId)
                    ->where('size', $sizeData['size'])
                    ->first();

                if ($existingSize) {
                    // Atualizar tamanho existente
                    $existingSize->update([
                        'price' => $sizeData['price'],
                    ]);
                } else {
                    // Criar novo tamanho
                    ProductColorSize::create([
                        'product_id' => $product->id,
                        'size' => $sizeData['size'],
                        'price' => $sizeData['price'],
                        'product_color_id' => $productColorId,
                    ]);
                }
            }
        }

        $sizesToDelete = array_diff($existingSizeIds, $sentSizeIds);
        if (!empty($sizesToDelete)) {
            ProductColorSize::whereIn('id', $sizesToDelete)->delete();
        }

        Log::info("Tamanhos atualizados", ['sizes' => $newSizes, 'deleted' => $sizesToDelete, 'existing_ids' => $existingSizeIds]);
    }

    // Atualizar imagens gerais
    $existingImages = $request->input('existing_images', []);
    $imagePaths = $product->images ?? [];
    $thumbnailPaths = $product->thumbnails ?? [];

    if (!empty($imagePaths)) {
        $imagesToRemove = array_diff($imagePaths, $existingImages);
        foreach ($imagesToRemove as $imageToRemove) {
            Storage::disk('public')->delete($imageToRemove);
            $thumbnailToRemove = str_replace('products/', 'products/thumbnails/', $imageToRemove);
            Storage::disk('public')->delete($thumbnailToRemove);
        }
    }

    $imagePaths = $existingImages;

    if ($request->hasFile('images')) {
        foreach ($request->file('images') as $image) {
            $imageName = uniqid() . '.webp';
            $imagePath = 'products/' . $imageName;
            $thumbPath = 'products/thumbnails/' . $imageName;

            $manager = new ImageManager(new Driver());
            $img = $manager->read($image->getPathname())->scale(width: 1000)->toWebp(90);
            Storage::disk('public')->put($imagePath, $img);

            $thumbnail = $manager->read($image->getPathname())->scale(width: 200, height: 200)->toWebp(50);
            Storage::disk('public')->put($thumbPath, $thumbnail);

            $imagePaths[] = $imagePath;
            $thumbnailPaths[] = $thumbPath;
        }
    }

    $product->update(['images' => $imagePaths, 'thumbnails' => $thumbnailPaths]);
    Log::info("Imagens gerais atualizadas", ['images' => $imagePaths, 'thumbnails' => $thumbnailPaths]);

    // Atualizar imagens por cor
    $existingColorImages = $request->input('existing_color_images', []);
    $currentColorImages = ProductColorImage::where('product_id', $product->id)
        ->pluck('image_path')
        ->toArray();
    Log::info("Imagens atuais no banco", ['current_color_images' => $currentColorImages]);

    $colorImagesToRemove = array_diff($currentColorImages, $existingColorImages);
    Log::info("Imagens a remover", ['color_images_to_remove' => $colorImagesToRemove]);
    
    foreach ($colorImagesToRemove as $colorImageToRemove) {
        Storage::disk('public')->delete($colorImageToRemove);
        $deleted = ProductColorImage::where('image_path', $colorImageToRemove)->delete();
        Log::info("Imagem removida", ['image' => $colorImageToRemove, 'deleted' => $deleted]);
    }

    $colorImageRecords = [];
    foreach ($existingColorImages as $existingColorImage) {
        $colorImage = ProductColorImage::where('image_path', $existingColorImage)->first();
        if ($colorImage) {
            $colorImageRecords[] = $colorImage->toArray();
        }
    }

    if ($request->has('color_images')) {
        foreach ($request->input('color_images', []) as $index => $colorImageData) {
            $colorId = $colorImageData['color_id'];
            if ($request->hasFile("color_images.{$index}.images")) {
                foreach ($request->file("color_images.{$index}.images") as $image) {
                    $imageName = uniqid() . '.webp';
                    $imagePath = 'products/color_images/' . $imageName;

                    $manager = new ImageManager(new Driver());
                    $img = $manager->read($image->getPathname())->scale(width: 1000)->toWebp(90);
                    Storage::disk('public')->put($imagePath, $img);

                    $colorImageRecords[] = ProductColorImage::create([
                        'product_id' => $product->id,
                        'product_color_id' => $colorId,
                        'image_path' => $imagePath,
                    ])->toArray();
                }
            }
        }
    }

    Log::info("Imagens por cor atualizadas", ['color_images' => $colorImageRecords]);

    $updatedProduct = Product::with(['campaign', 'sizes', 'colorImages'])->find($id);
    Log::info("Produto final retornado", ['updated_product' => $updatedProduct->toArray()]);

    return response()->json(['message' => 'Produto atualizado com sucesso!', 'product' => $updatedProduct]);
}

    public function destroy($id)
    {
        $product = Product::findOrFail($id);

        // Deletar imagens associadas (opcional)
        if ($product->images) {
            foreach ($product->images as $image) {
                Storage::disk('public')->delete($image);
            }
        }
        if ($product->thumbnails) {
            foreach ($product->thumbnails as $thumbnail) {
                Storage::disk('public')->delete($thumbnail);
            }
        }

        ProductSize::where('product_id', $product->id)->delete();
        $product->delete();

        return response()->json(['message' => 'Produto deletado com sucesso!']);
    }

    public function getCampanhas()
    {
        $campanhas = Campaign::all();
        return response()->json($campanhas);
    }
    
    public function getRecommendedByGender(Request $request, $genderId)
{
    Log::info('Iniciando ProductController@getRecommendedByGender', ['genderId' => $genderId]);

    $products = Product::with(['campaign', 'colorSizes', 'colorImages', 'productColors'])
        ->whereHas('campaign', function ($query) use ($genderId) {
            $query->where('gender_id', $genderId);
        })
        ->inRandomOrder()
        ->limit(3)
        ->get();

    Log::info('Produtos recomendados retornados', [
        'products_count' => $products->count(),
        'products' => $products->toArray(),
    ]);

    return response()->json($products);
}

}