<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use App\Models\ProductImage;

class Product extends Model
{
    use HasFactory;

    protected $fillable = ['nome', 'brand_id', 'descricao', 'images', 'thumbnails', 'campaign_id', 'preco', 'colors'];

    protected $casts = [
        'images' => 'array',
        'thumbnails' => 'array',
        'colors' => 'json',
    ];

    public function colorSizes()
    {
        return $this->hasMany(ProductColorSize::class);
    }
    

public function colorImages()
{
    return $this->hasMany(ProductColorImage::class, 'product_id');
}

    public function campaign()
    {
        return $this->belongsTo(Campaign::class);
    }

    public function orders(): BelongsToMany
    {
        return $this->belongsToMany(Order::class, 'order_product')->withPivot('quantidade');
    }

    public function sizes()
    {
        return $this->hasMany(ProductSize::class);
    }    

    public function productSizes()
    {
        return $this->hasMany(ProductSize::class);
    }

        public function orderProducts()
    {
        return $this->hasMany(OrderProduct::class);
    }

    public function brand()
    {
        return $this->belongsTo(Brand::class);
    }

public function productColors()
{
    return $this->belongsToMany(ProductColor::class, 'product_color_sizes', 'product_id', 'product_color_id');
}

// Relação com ProductColor (opcional, se precisar dos objetos completos)
public function colorsRelation()
{
    return $this->belongsToMany(ProductColor::class, 'product_product_color', 'product_id', 'product_color_id')
                ->withPivot('id');
}

  // Acessor para o atributo colors
public function getColorsAttribute($value)
    {
        if (is_null($value) || empty($value)) {
            // Se colors estiver vazio, retorna os nomes das cores de productColors
            return $this->productColors->pluck('name')->unique()->values()->toArray();
        }

        $colorIds = is_string($value) ? json_decode($value, true) : $value;
        $colorIds = is_array($colorIds) ? $colorIds : [];

        return ProductColor::whereIn('id', $colorIds)->pluck('name')->toArray();
    }

    public function images()
        {
            return $this->hasMany(ProductImage::class, 'product_id');
        }
    // Verifica se o produto deve ser exibido ao usuário (campanha ativa e flag ativo true)
    public function isAvailable()
    {
        return !in_array($this->campaign->status, ['pausado', 'finalizado']) && $this->campaign->isActive();
    }
}