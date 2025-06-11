<?php

// database/migrations/2025_02_03_000005_create_orders_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateOrdersTable extends Migration
{
    public function up()
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('nome_cliente');
            $table->string('telefone');
            $table->text('observacoes')->nullable();
            // Poderíamos armazenar os produtos selecionados via JSON ou utilizar uma tabela pivot (order_products)
            $table->json('produtos');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('orders');
    }
}

