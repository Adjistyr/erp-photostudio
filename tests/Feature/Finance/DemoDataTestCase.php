<?php

namespace Tests\Feature\Finance;

use App\Models\Order;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Basis test keuangan: dataset prototype (DemoSeeder) dengan "hari ini"
 * 26 Agustus 2026 — sama dengan HARI_INI di web/app/lib/dummy.ts. Angka yang
 * di-assert di subclass adalah porting dari test TypeScript prototype.
 */
abstract class DemoDataTestCase extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed per test, BUKAN lewat properti $seed: RefreshDatabase hanya
        // migrate (dan seed) sekali per proses, oleh class test pertama yang
        // jalan. Di suite penuh test auth jalan duluan tanpa seed, jadi data
        // demo tidak pernah masuk. Seed di sini ikut di-rollback transaksi
        // setiap selesai test.
        $this->seed(DemoSeeder::class);
        $this->travelTo('2026-08-26 09:00:00');
    }

    protected function order(string $number): Order
    {
        return Order::with(['items', 'payments', 'jobCosts'])->where('number', $number)->firstOrFail();
    }
}
