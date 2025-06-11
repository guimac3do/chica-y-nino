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
use Illuminate\Support\Facades\Log;


class ProductController extends Controller
{


    public function store(Request $request)
    {
        $request->validate([
            'nome' => 'required|string|max:255',
            'descricao' => 'nullable|string',
            'campaign_id' => 'required|exists:campaigns,id',
            'preco' => 'required|numeric',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:4096',
            'sizes' => 'required|array',
            'colors' => 'nullable|array',
            'colors.*' => 'integer|exists:product_colors,id',
            'color_images' => 'nullable|array', // Novo campo opcional
            'color_images.*.color_id' => 'required_with:color_images|integer|exists:product_colors,id',
            'color_images.*.images.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:4096',
        ]);
    
        $imagePaths = [];
        $thumbnailPaths = [];
    
        // Processar imagens gerais do produto (não associadas a cores)
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
            'colors' => $request->colors ?? [],
        ]);
    
        // Associar tamanhos
        foreach ($request->sizes as $size => $price) {
            ProductSize::create([
                'product_id' => $product->id,
                'size' => $size,
                'price' => $price,
            ]);
        }
    
        // Processar imagens associadas a cores (opcional)
        if ($request->has('color_images')) {
            foreach ($request->file('color_images') as $colorImageData) {
                $colorId = $colorImageData['color_id'];
                if (isset($colorImageData['images'])) {
                    foreach ($colorImageData['images'] as $image) {
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
        }
    
        // Carregar as relações para retornar
        $product->load('sizes', 'colorImages');
    
        return response()->json(['message' => 'Produto criado com sucesso!', 'product' => $product]);
    }


    // Retorna apenas os produtos com campanha ativa
    public function index(Request $request)
    {
        $query = Product::with(['campaign', 'sizes']); // Add 'sizes' here
        
        if ($request->has('campanhaId')) {
            $query->where('campaign_id', $request->campanhaId);
        }
    
        $products = $query->get();
    
        return response()->json($products);
    }
    

    public function show($id)
    {
        $product = Product::with(['campaign', 'brand', 'sizes'])->findOrFail($id);
        if (!$product->isAvailable()) {
            return response()->json(['error' => 'Produto indisponível.'], 404);
        }
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
        'sizes.*.size' => 'required|string|max:255',
        'sizes.*.price' => 'required|numeric',
        'colors' => 'nullable|array',
        'colors.*' => 'string|max:255',
        'descricao' => 'nullable|string',
        'campaign_id' => 'sometimes|required|exists:campaigns,id',
        'images.*' => 'sometimes|image|mimes:jpeg,png,jpg,gif,webp|max:4096',
        'existing_images' => 'nullable|array', // Validação para imagens mantidas
        'existing_images.*' => 'string',
    ]);

    $product = Product::findOrFail($id);
    Log::info("Produto encontrado", ['product' => $product->toArray()]);

    // Converter nomes de cores em IDs
    $colorsInput = $request->input('colors', $product->colors);
    $colorIds = [];
    if (!empty($colorsInput)) {
        foreach ($colorsInput as $colorName) {
            $color = ProductColor::firstOrCreate(['name' => $colorName]);
            $colorIds[] = $color->id;
        }
    }

    // Preparar dados para atualização
    $productData = [
        'nome' => $request->input('nome', $product->nome),
        'preco' => $request->input('preco', $product->preco),
        'colors' => $colorIds,
        'descricao' => $request->input('descricao', $product->descricao),
        'campaign_id' => $request->input('campaign_id', $product->campaign_id),
    ];

    // Atualizar o produto
    $updated = $product->update($productData);
    Log::info("Resultado da atualização", ['updated' => $updated, 'product' => $product->toArray()]);

    // Atualizar tamanhos
    if ($request->has('sizes')) {
        ProductSize::where('product_id', $product->id)->delete();
        foreach ($request->input('sizes', []) as $sizeData) {
            ProductSize::create([
                'product_id' => $product->id,
                'size' => $sizeData['size'],
                'price' => $sizeData['price'],
            ]);
        }
        Log::info("Tamanhos atualizados", ['sizes' => $request->input('sizes')]);
    }

    // Atualizar imagens
    $existingImages = $request->input('existing_images', []);
    $imagePaths = $product->images ?? [];
    $thumbnailPaths = $product->thumbnails ?? [];

    // Remover imagens que não estão mais na lista de existing_images
    if (!empty($imagePaths)) {
        $imagesToRemove = array_diff($imagePaths, $existingImages);
        foreach ($imagesToRemove as $imageToRemove) {
            Storage::disk('public')->delete($imageToRemove);
            // Remover também o thumbnail correspondente, se existir
            $thumbnailToRemove = str_replace('products/', 'products/thumbnails/', $imageToRemove);
            Storage::disk('public')->delete($thumbnailToRemove);
        }
    }

    // Atualizar o array de imagens com as mantidas
    $imagePaths = $existingImages;

    // Adicionar novas imagens, se enviadas
    if ($request->hasFile('images')) {
        foreach ($request->file('images') as $image) {
            $imageName = uniqid() . '.webp';
            $imagePath = 'products/' . $imageName;
            $thumbPath = 'products/thumbnails/' . $imageName;

            $manager = new ImageManager(new Driver());
            $img = $manager->read($image->getPathname())
                ->scale(width: 1000)
                ->toWebp(90);
            Storage::disk('public')->put($imagePath, $img);

            $thumbnail = $manager->read($image->getPathname())
                ->scale(width: 200, height: 200)
                ->toWebp(50);
            Storage::disk('public')->put($thumbPath, $thumbnail);

            $imagePaths[] = $imagePath;
            $thumbnailPaths[] = $thumbPath;
        }
    }

    // Salvar as imagens atualizadas
    $product->update([
        'images' => $imagePaths,
        'thumbnails' => $thumbnailPaths,
    ]);
    Log::info("Imagens atualizadas", ['images' => $imagePaths, 'thumbnails' => $thumbnailPaths]);

    // Recarregar o produto com relações
    $updatedProduct = Product::with(['campaign', 'sizes'])->find($id);
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
}