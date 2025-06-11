<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up() {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'marca_id')) {
                $table->unsignedBigInteger('marca_id')->after('id');
            }
            if (!Schema::hasColumn('products', 'descricao')) {
                $table->text('descricao')->nullable()->after('nome');
            }
            if (!Schema::hasColumn('products', 'campaign_id')) {
                $table->unsignedBigInteger('campaign_id')->after('descricao');
            }
            if (!Schema::hasColumn('products', 'preco')) {
                $table->decimal('preco', 10, 2)->after('campaign_id');
            }
            if (!Schema::hasColumn('products', 'miniaturas_de_imagens')) {
                $table->json('miniaturas_de_imagens')->nullable()->after('preco');
            }
        });
    }

    public function down() {
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['campaign_id']);
            $table->dropForeign(['marca_id']);
            $table->dropColumn(['marca_id', 'descricao', 'campaign_id', 'preco', 'miniaturas_de_imagens']);
        });
    }
};
