<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up() {
        Schema::table('campaigns', function (Blueprint $table) {
            if (!Schema::hasColumn('campaigns', 'genero_id')) {
                $table->unsignedBigInteger('genero_id')->after('nome');
            }
            if (!Schema::hasColumn('campaigns', 'marca_id')) {
                $table->unsignedBigInteger('marca_id')->after('genero_id');
            }
            if (!Schema::hasColumn('campaigns', 'data_inicio')) {
                $table->date('data_inicio')->after('marca_id');
            }
            if (!Schema::hasColumn('campaigns', 'data_fim')) {
                $table->date('data_fim')->after('data_inicio');
            }
        });
    }

    public function down() {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn(['genero_id', 'marca_id', 'data_inicio', 'data_fim']);
        });
    }
};