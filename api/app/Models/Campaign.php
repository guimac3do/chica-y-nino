<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Carbon\Carbon;

class Campaign extends Model
{
    use HasFactory;
    protected $fillable = ['nome', 'gender_id', 'marca', 'data_inicio', 'data_fim'];

    public function gender()
    {
        return $this->belongsTo(related: Gender::class);
    }

    public function brand()
    {
        return $this->belongsTo(Brand::class, 'brand_id');
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    // Método para verificar se a campanha está ativa
    public function isActive()
    {
        $now = Carbon::now();
        return $now->between($this->data_inicio, $this->data_fim);
    }

    
}
