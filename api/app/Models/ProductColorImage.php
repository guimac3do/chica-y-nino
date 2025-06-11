<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ProductColorImage extends Model
{
    use HasFactory;
protected $table = 'product_color_images';
    protected $fillable = [
        'product_id',
        'product_color_id',
        'image_path',
        'thumbnail_path',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function color()
    {
        return $this->belongsTo(ProductColor::class, 'product_color_id');
    }
}