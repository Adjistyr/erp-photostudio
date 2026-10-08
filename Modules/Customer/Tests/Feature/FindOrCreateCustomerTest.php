<?php

namespace Modules\Customer\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Customer\Actions\FindOrCreateCustomer;
use Modules\Customer\Models\Customer;
use Tests\TestCase;

/** Urutan dedup customer: HP → nama → buat (POS & form order). */
class FindOrCreateCustomerTest extends TestCase
{
    use RefreshDatabase;

    private function find(string $name, ?string $phone = null): Customer
    {
        return app(FindOrCreateCustomer::class)->execute($name, $phone);
    }

    public function test_phone_wins_over_name()
    {
        $budi = Customer::create(['name' => 'Budi', 'phone' => '08123456']);
        Customer::create(['name' => 'Sari']);

        // Nama "Sari", tapi HP milik Budi (data lama 08…) → Budi.
        $this->assertSame($budi->id, $this->find('Sari', '+62 8123456')->id);
    }

    public function test_name_match_takes_oldest_and_fills_missing_phone()
    {
        $first = Customer::create(['name' => 'Rina']);
        Customer::create(['name' => 'rina']);

        $found = $this->find('RINA', '0811');

        $this->assertSame($first->id, $found->id);
        $this->assertSame('62811', $found->refresh()->phone);
    }

    public function test_creates_when_nothing_matches()
    {
        $created = $this->find('  Orang Baru  ', '0899 1');

        $this->assertTrue($created->wasRecentlyCreated);
        $this->assertSame(['Orang Baru', '628991'], [$created->name, $created->phone]);
    }
}
