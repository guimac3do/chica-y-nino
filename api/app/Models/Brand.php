<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Brand extends Model
{
    use HasFactory;

    protected $fillable = ['nome', 'campaign_id']; // Certifique-se de incluir 'campaign_id'

    public function campaign()
    {
        return $this->belongsTo(Campaign::class, 'campaign_id');
    }
}
