<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Order extends Model
{
    protected $fillable = ['id_cliente', 'telefone', 'observacoes', 'created_at', 'updated_at', 'notificacoes_enviadas'];

public function products()
    {
        return $this->belongsToMany(Product::class, 'order_product')
                    ->withPivot([
                        'id',
                        'quantidade',
                        'cor',
                        'status_pagamento',
                        'status_estoque',
                        'processado',
                        'product_size_id'
                    ]);
    }

    public function cliente()
    {
        return $this->belongsTo(User::class, 'id_cliente');
    }

    public function items()
    {
        return $this->hasMany(OrderProduct::class);
    }

}
