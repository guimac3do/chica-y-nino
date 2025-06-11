<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Image;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;
use Illuminate\Support\Facades\Log;

class ImageController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'images.*' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:4096',
        ]);

        $imagePaths = [];
        $thumbnailPaths = [];

        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $image) {
                $imageName = uniqid() . '.webp';
                $imagePath = 'images/' . $imageName;
                $thumbPath = 'images/thumbnails/' . $imageName;

                $manager = new ImageManager(new Driver());
                $img = $manager->read($image->getPathname())->scale(width: 1000)->toWebp(90);
                Storage::disk('public')->put($imagePath, $img);

                $thumbnail = $manager->read($image->getPathname())->scale(width: 200, height: 200)->toWebp(50);
                Storage::disk('public')->put($thumbPath, $thumbnail);

                $imagePaths[] = $imagePath;
                $thumbnailPaths[] = $thumbPath;

                Image::create([
                    'image_path' => $imagePath,
                    'thumbnail_path' => $thumbPath,
                ]);
            }
        }

        return response()->json(['message' => 'Imagens enviadas com sucesso!', 'images' => $imagePaths], 201);
    }

    public function index()
    {
        $images = Image::all();
        return response()->json($images);
    }

    public function destroy($id)
    {
        $image = Image::findOrFail($id);

        // Deletar os arquivos do storage
        Storage::disk('public')->delete($image->image_path);
        Storage::disk('public')->delete($image->thumbnail_path);

        // Deletar o registro do banco
        $image->delete();

        return response()->json(['message' => 'Imagem deletada com sucesso!']);
    }
}