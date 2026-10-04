<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('owners', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            // Owner = pihak bagi hasil, user = akun login. Tidak selalu sama: staf
            // punya login tapi bukan owner, owner bisa belum punya akun.
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('profit_share_rules', function (Blueprint $table) {
            $table->id();
            // "YYYY-MM". Aturan berlaku mulai bulan ini; mengubah rasio = baris baru,
            // bukan edit, supaya bagi hasil bulan lama tidak ikut berubah (8.6).
            $table->string('effective_month', 7)->unique();
            $table->unsignedTinyInteger('reserve_percent');
            $table->timestamps();
        });

        Schema::create('owner_profit_share_rule', function (Blueprint $table) {
            $table->foreignId('profit_share_rule_id')->constrained()->cascadeOnDelete();
            $table->foreignId('owner_id')->constrained()->restrictOnDelete();
            // Persen bilangan bulat — pecahan float tidak selalu berjumlah persis 100.
            $table->unsignedTinyInteger('percent');

            $table->primary(['profit_share_rule_id', 'owner_id']);
        });

        Schema::create('opening_balances', function (Blueprint $table) {
            $table->id();
            // Ringkasan bulan sebelum app dipakai, dari sheet client (8.8).
            $table->string('month', 7)->unique();
            $table->bigInteger('revenue');
            $table->bigInteger('net_profit');
            $table->string('source');
            $table->timestamps();
        });

        Schema::create('owner_contributions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained()->restrictOnDelete();
            $table->date('contributed_on');
            $table->bigInteger('amount');
            $table->string('kind'); // ContributionKind
            $table->string('destination'); // ContributionDestination
            $table->string('note');
            $table->timestamps();
        });

        Schema::create('investments', function (Blueprint $table) {
            $table->id();
            $table->date('invested_on');
            $table->string('description');
            $table->bigInteger('amount');
            // Null = dibayar dari kas usaha, bukan setoran modal owner.
            $table->foreignId('owner_contribution_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('fund_withdrawals', function (Blueprint $table) {
            $table->id();
            $table->string('fund'); // Fund
            $table->date('withdrawn_on');
            $table->bigInteger('amount');
            $table->string('note');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fund_withdrawals');
        Schema::dropIfExists('investments');
        Schema::dropIfExists('owner_contributions');
        Schema::dropIfExists('opening_balances');
        Schema::dropIfExists('owner_profit_share_rule');
        Schema::dropIfExists('profit_share_rules');
        Schema::dropIfExists('owners');
    }
};
