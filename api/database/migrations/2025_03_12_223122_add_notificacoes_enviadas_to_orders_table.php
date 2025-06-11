<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddNotificacoesEnviadasToOrdersTable extends Migration
{
    public function up()
    {
        // Adiciona notificacoes_enviadas à tabela orders
        Schema::table('orders', function (Blueprint $table) {
            $table->integer('notificacoes_enviadas')->default(0)->after('observacoes');
        });

        // Copia os dados existentes de order_product para orders (soma por pedido)
        DB::statement('
            UPDATE orders
            SET notificacoes_enviadas = (
                SELECT COALESCE(SUM(notificacoes_enviadas), 0)
                FROM order_product
                WHERE order_product.order_id = orders.id
            )
        ');

        // Remove a coluna de order_product
        Schema::table('order_product', function (Blueprint $table) {
            $table->dropColumn('notificacoes_enviadas');
        });
    }

    public function down()
    {
        // Reverte: adiciona a coluna de volta em order_product
        Schema::table('order_product', function (Blueprint $table) {
            $table->integer('notificacoes_enviadas')->default(0)->after('status_estoque');
        });

        // Copia os dados de volta para order_product (distribui igualmente, se necessário)
        DB::statement('
            UPDATE order_product
            SET notificacoes_enviadas = (
                SELECT notificacoes_enviadas
                FROM orders
                WHERE orders.id = order_product.order_id
            ) / (
                SELECT COUNT(*)
                FROM order_product AS op
                WHERE op.order_id = order_product.order_id
            )
        ');

        // Remove a coluna de orders
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('notificacoes_enviadas');
        });
    }
}