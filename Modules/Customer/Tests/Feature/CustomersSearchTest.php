<?php

namespace Modules\Customer\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Modules\Customer\Models\Customer;
use Tests\TestCase;

/** Pencarian + paginasi Customer (docs/specs/3.1). */
class CustomersSearchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoSeeder::class);
        $this->actingAs(User::factory()->create());
    }

    /** @return list<string> */
    private function names(array $query): array
    {
        return array_column($this->get(route('customers.index', $query))->inertiaPage()['props']['customers']['data'], 'name');
    }

    public function test_search_by_name_and_phone()
    {
        $this->assertSame(['Budi Hartono'], $this->names(['q' => 'budi']));
        $this->assertSame(['Nadia Salsabila'], $this->names(['q' => '0896 1122']));
        $this->assertSame(['Nadia Salsabila'], $this->names(['q' => '6289611228899']));
    }

    public function test_line_filter_requires_non_cancelled_order_in_line()
    {
        // Fajar hanya punya order event yang BATAL — tidak dihitung pelanggan event.
        $names = $this->names(['line' => 'event']);
        sort($names);

        $this->assertSame(['Nadia Salsabila', 'Rani & Dimas'], $names);
    }

    public function test_summaries_only_computed_for_current_page()
    {
        foreach (range(1, 30) as $n) {
            Customer::create(['name' => sprintf('Lead %02d', $n)]);
        }

        DB::enableQueryLog();
        $page = $this->get(route('customers.index'))->inertiaPage()['props']['customers'];
        $queries = collect(DB::getQueryLog())->pluck('query');
        DB::disableQueryLog();

        $this->assertCount(25, $page['data']);
        $this->assertSame(2, $page['last_page']);
        // Order hanya dimuat untuk 25 customer di halaman ini, bukan semua customer.
        $ordersQuery = (string) $queries->first(fn (string $q) => str_contains($q, 'from "orders"'));
        $this->assertSame(1, preg_match('/"customer_id" in \(([^)]*)\)/', $ordersQuery, $m), $ordersQuery);
        $this->assertCount(25, explode(',', $m[1]));
    }
}
