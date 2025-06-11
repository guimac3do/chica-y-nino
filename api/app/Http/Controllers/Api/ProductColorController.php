<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProductColor;
use Illuminate\Http\Request;

class ProductColorController extends Controller
{
    /**
     * Listar todas as cores de produtos
     */
    public function index()
    {
        $colors = ProductColor::all();
        return response()->json($colors);
    }

    /**
     * Criar uma nova cor
     */
public function store(Request $request)
{
    $request->validate([
        'nome' => 'required|string|max:255',
        'descricao' => 'nullable|string',
        'campaign_id' => 'required|exists:campaigns,id',
        'preco' => 'required|numeric',
        'images.*' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:4096',
        'sizes' => 'required|array',
        'colors' => 'nullable|array',
        'colors.*' => 'integer|exists:product_colors,id',
        'color_images.*.*' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:4096',
    ]);

    $imagePaths = [];
    $thumbnailPaths = [];
    $colorImagePaths = [];

    // Processar imagens gerais
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

    // Processar imagens por cor (opcional)
    if ($request->hasFile('color_images')) {
        foreach ($request->file('color_images') as $colorId => $images) {
            $colorImagePaths[$colorId] = [];
            foreach ($images as $image) {
                $imageName = uniqid() . '.webp';
                $imagePath = "products/color_$colorId/" . $imageName;

                $manager = new ImageManager(new Driver());
                $img = $manager->read($image->getPathname())->scale(width: 1000)->toWebp(90);
                Storage::disk('public')->put($imagePath, $img);

                $colorImagePaths[$colorId][] = $imagePath;
            }
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
        'color_images' => $colorImagePaths, // Novo campo
    ]);

    foreach ($request->sizes as $size => $price) {
        ProductSize::create([
            'product_id' => $product->id,
            'size' => $size,
            'price' => $price,
        ]);
    }

    return response()->json(['message' => 'Produto criado com sucesso!', 'product' => $product]);
}
    /**
     * Mostrar uma cor específica
     */
    public function show($id)
    {
        $color = ProductColor::findOrFail($id);
        return response()->json($color);
    }

    /**
     * Atualizar uma cor existente
     */
    public function update(Request $request, $id)
    {
        $color = ProductColor::findOrFail($id);
        
        $request->validate([
            'name' => 'required|string|max:255|unique:product_colors,name,' . $id,
        ]);

        $color->update($request->only('name'));
        return response()->json($color);
    }

    /**
     * Remover uma cor
     */
    public function destroy($id)
    {
        $color = ProductColor::findOrFail($id);
        $color->delete();
        return response()->json(null, 204);
    }
}