<?php
namespace App\Models;


use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderProduct extends Model
{
    protected $table = 'order_product';
    protected $fillable = [
        'order_id',
        'product_id',
        'product_size_id',
        'quantidade',
        'cor',
        'status_pagamento',
        'status_estoque',
        'notificacoes_enviadas',
        'is_processed',
        'processed_at',
    ];
    public $timestamps = false; // Desativa created_at e updated_at
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

public function productSize()
{
    return $this->belongsTo(ProductColorSize::class, 'product_size_id');
}
}
