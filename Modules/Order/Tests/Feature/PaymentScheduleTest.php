<?php

namespace Modules\Order\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Customer\Models\Customer;
use Modules\Order\Models\Order;
use Modules\Order\Models\OrderItem;
use Modules\Order\Models\PaymentSchedule;
use Tests\TestCase;

/** Termin pembayaran per order event (docs/specs/6.4-termin-pembayaran.md). */
class PaymentScheduleTest extends TestCase
{
    use RefreshDatabase;

    /** Termin 30/50/20 untuk order event 10 jt, acara 5 Okt. */
    private const SCHEDULES = [
        ['due_on' => '2026-08-26', 'amount' => 3_000_000, 'label' => 'DP'],
        ['due_on' => '2026-09-28', 'amount' => 5_000_000, 'label' => ''],
        ['due_on' => '2026-10-04', 'amount' => 2_000_000, 'label' => 'Pelunasan'],
    ];

    /** ORD-0011: event 8,5 jt, DP 2,5 jt (14 Agu), acara 18 Okt. */
    private const ORD_0011_SCHEDULES = [
        ['due_on' => '2026-08-14', 'amount' => 2_550_000, 'label' => 'DP'],
        ['due_on' => '2026-10-11', 'amount' => 4_250_000, 'label' => null],
        ['due_on' => '2026-10-17', 'amount' => 1_700_000, 'label' => 'Pelunasan'],
    ];

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoSeeder::class);
        $this->travelTo('2026-08-26 09:00:00');
        $this->actingAs(User::factory()->create());
    }

    /** @param  array<string, mixed>  $data */
    private function store(array $data = []): TestResponse
    {
        return $this->post(route('orders.store'), [
            'business_line' => 'event',
            'customer_id' => Customer::where('name', 'Dewi Anggraini')->sole()->id,
            'service_date' => '2026-10-05',
            'items' => [['name' => 'Paket Wedding Nego', 'unit_price' => 10_000_000, 'quantity' => 1]],
            'schedules' => self::SCHEDULES,
            ...$data,
        ]);
    }

    private function newest(): Order
    {
        return Order::with(['items', 'payments', 'schedules'])->orderByDesc('id')->firstOrFail();
    }

    private function ord0011(): Order
    {
        return Order::with(['items', 'payments', 'customer', 'schedules'])->where('number', 'ORD-0011')->sole();
    }

    /**
     * Isian Ubah Order persis seperti tersimpan — tiap test mengubah yang diuji.
     *
     * @param  array<string, mixed>  $overrides
     */
    private function update(Order $order, array $overrides = []): TestResponse
    {
        return $this->put(route('orders.update', $order), [
            'customer_id' => $order->customer_id,
            'service_date' => $order->service_date->toDateString(),
            'service_time' => '',
            'location' => $order->location ?? '',
            'notes' => $order->notes ?? '',
            'items' => $order->items->map(fn (OrderItem $i) => [
                'id' => $i->id, 'catalog_item_id' => $i->catalog_item_id, 'quantity' => $i->quantity,
            ])->values()->all(),
            ...$overrides,
        ]);
    }

    private function withOrd0011Schedules(): Order
    {
        $order = $this->ord0011();
        foreach (self::ORD_0011_SCHEDULES as $i => $s) {
            $order->schedules()->create([...$s, 'sequence' => $i + 1]);
        }

        return $this->ord0011();
    }

    public function test_event_order_can_have_schedules_summing_to_total()
    {
        $this->store(['dp' => 3_000_000, 'dp_method' => 'transfer'])->assertSessionHasNoErrors();

        $order = $this->newest();
        $this->assertSame(
            [[1, '2026-08-26', 3_000_000, 'DP'], [2, '2026-09-28', 5_000_000, null], [3, '2026-10-04', 2_000_000, 'Pelunasan']],
            $order->schedules->map(fn (PaymentSchedule $s) => [$s->sequence, $s->due_on->toDateString(), $s->amount, $s->label])->all(),
        );

        // Detail order: DP menutup termin 1; termin 2 jadi jatuh tempo berikutnya.
        $this->get(route('orders.show', $order))
            ->assertInertia(fn (Assert $page) => $page
                ->where('order.schedules.0.status', 'paid')
                ->where('order.schedules.1.status', 'unpaid')
                ->where('order.schedules.1.label', null)
                ->where('order.schedules.2.due_on', '2026-10-04')
                ->where('order.next_installment', ['sequence' => 2, 'of' => 3, 'amount' => 5_000_000, 'due_on' => '2026-09-28'])
                ->where('order.due_on', '2026-09-28')
            );
    }

    public function test_schedule_sum_mismatch_rejected()
    {
        $short = self::SCHEDULES;
        $short[2]['amount'] = 1_500_000;
        $this->store(['schedules' => $short])
            ->assertSessionHasErrors(['schedules' => 'Jumlah termin kurang Rp 500.000 dari total.']);

        $long = self::SCHEDULES;
        $long[0]['amount'] = 3_250_000;
        $this->store(['schedules' => $long])
            ->assertSessionHasErrors(['schedules' => 'Jumlah termin lebih Rp 250.000 dari total.']);

        // Satu termin tidak berarti.
        $this->store(['schedules' => [['due_on' => '2026-10-04', 'amount' => 10_000_000]]])
            ->assertSessionHasErrors('schedules');

        $this->assertSame(0, PaymentSchedule::count());
    }

    public function test_schedule_after_service_date_rejected()
    {
        $late = self::SCHEDULES;
        $late[2]['due_on'] = '2026-10-06';
        $this->store(['schedules' => $late])
            ->assertSessionHasErrors(['schedules.2.due_on' => 'Termin terakhir melewati tanggal acara (5 Okt 2026).']);

        // Tepat di tanggal acara boleh.
        $onDay = self::SCHEDULES;
        $onDay[2]['due_on'] = '2026-10-05';
        $this->store(['schedules' => $onDay])->assertSessionHasNoErrors();
    }

    public function test_schedule_dates_must_increase()
    {
        $same = self::SCHEDULES;
        $same[1]['due_on'] = '2026-08-26';
        $this->store(['schedules' => $same])
            ->assertSessionHasErrors(['schedules.1.due_on' => 'Tanggal termin 2 harus setelah termin 1.']);

        $this->assertSame(0, PaymentSchedule::count());
    }

    public function test_studio_order_rejects_schedules()
    {
        $this->store([
            'business_line' => 'studio',
            'schedules' => [['due_on' => '2026-09-01', 'amount' => 5_000_000], ['due_on' => '2026-10-01', 'amount' => 5_000_000]],
        ])->assertSessionHasErrors(['schedules' => 'Termin pembayaran hanya untuk order event.']);

        // Form studio mengirim [] — tanpa termin, bukan error.
        $this->store(['business_line' => 'studio', 'schedules' => []])->assertSessionHasNoErrors();
        $this->assertSame(0, PaymentSchedule::count());
    }

    public function test_fifo_statuses_and_due_on()
    {
        // 40% dari 10 jt pada termin 30/50/20.
        $this->store(['dp' => 4_000_000, 'dp_method' => 'transfer'])->assertSessionHasNoErrors();
        $order = $this->newest();

        $this->assertSame(['paid', 'partial', 'unpaid'], array_map(fn (array $r) => $r['status']->value, $order->scheduleStatuses()));
        $this->assertSame('2026-09-28', $order->dueOn()->toDateString());
        $this->assertSame(33, $order->daysUntilDue(today()));
        // Yang ditagih = sisa termin 2, bukan nominal penuhnya.
        $this->assertSame(['sequence' => 2, 'of' => 3, 'amount' => 4_000_000, 'due_on' => '2026-09-28'], $order->nextInstallment());

        // Tanpa termin: jatuh tempo = tanggal layanan, tanpa termin berikutnya.
        $plain = $this->ord0011();
        $this->assertSame('2026-10-18', $plain->dueOn()->toDateString());
        $this->assertNull($plain->nextInstallment());
    }

    public function test_receivables_use_next_installment_due()
    {
        $this->withOrd0011Schedules();
        $expected = ['sequence' => 1, 'of' => 3, 'amount' => 50_000, 'due_on' => '2026-08-14'];

        // DP 2,5 jt belum menutup termin 1 (2,55 jt, 14 Agu) → lewat 12 hari,
        // bukan 53 hari lagi (tanggal acara).
        $this->get(route('receivables.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('orders.0.number', 'ORD-0011')
                ->where('orders.0.due_on', '2026-08-14')
                ->where('orders.0.days_until_due', -12)
                ->where('orders.0.next_installment', $expected)
                // Order tanpa termin tetap jatuh tempo di tanggal layanan.
                ->where('orders.1.number', 'ORD-0008')
                ->where('orders.1.due_on', '2026-08-12')
                ->where('orders.1.next_installment', null)
                ->where('totals.overdue', 7_500_000)
                ->where('totals.overdue_count', 2)
            );

        $this->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('receivables.overdue_count', 2)
                ->where('receivables.orders.0.days_until_due', -12)
                ->where('receivables.orders.0.next_installment', $expected)
            );

        $this->get(route('reports.receivables'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('aging.0.label', 'Belum jatuh tempo')
                ->where('aging.0.amount', 550_000)
                ->where('aging.1.amount', 7_500_000)
                ->where('orders.0.days_until_due', -12)
                ->where('orders.0.next_installment', $expected)
            );

        // Pesan tagihan dari Invoice memakai jatuh tempo yang sama.
        $this->get(route('invoices.index', ['q' => 'ORD-0011']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('invoices.data.0.due_on', '2026-08-14')
                ->where('invoices.data.0.next_installment', $expected)
            );
    }

    public function test_payment_receipt_due_on_follows_next_installment()
    {
        $order = $this->withOrd0011Schedules();

        // 50 rb menutup termin 1 → bukti bayar menyebut jatuh tempo termin 2.
        $this->post(route('orders.payments.store', $order), ['paid_on' => '2026-08-26', 'amount' => 50_000, 'method' => 'transfer'])
            ->assertSessionHasNoErrors()
            ->assertSessionHas('inertia.flash_data.receipt.due_on', '2026-10-11');
    }

    public function test_update_replaces_schedules_and_records_event()
    {
        $order = $this->ord0011();

        $this->update($order, ['schedules' => self::ORD_0011_SCHEDULES])
            ->assertSessionHasNoErrors()
            ->assertSessionHas('inertia.flash_data.toast.message', 'ORD-0011 diperbarui.');
        $order->refresh()->load('schedules');
        $this->assertSame([2_550_000, 4_250_000, 1_700_000], $order->schedules->pluck('amount')->all());
        $this->assertNull($order->events()->first()?->changes['schedules']['from'] ?? null);
        $this->assertSame('2026-10-17', $order->events()->first()?->changes['schedules']['to'][2]['due_on'] ?? null);

        // Tidak dikirim = tetap.
        $this->update($this->ord0011(), ['notes' => 'Venue dikonfirmasi'])->assertSessionHasNoErrors();
        $this->assertSame(3, PaymentSchedule::count());

        // Memindah acara sebelum termin terakhir ditolak walau termin tidak dikirim.
        $this->update($this->ord0011(), ['service_date' => '2026-10-16'])
            ->assertSessionHasErrors('schedules.2.due_on');

        // [] = hapus semua termin.
        $this->update($this->ord0011(), ['schedules' => []])->assertSessionHasNoErrors();
        $this->assertSame(0, PaymentSchedule::count());
    }

    public function test_updating_total_drops_schedules_with_warning()
    {
        $order = $this->withOrd0011Schedules();
        $items = $order->items->map(fn (OrderItem $i) => ['id' => $i->id, 'catalog_item_id' => $i->catalog_item_id, 'quantity' => $i->quantity])->all();
        $items[] = ['name' => 'Drone', 'unit_price' => 500_000, 'quantity' => 1];

        // Termin lama (Σ 8,5 jt) ikut terkirim, total jadi 9 jt → termin dihapus, bukan ditolak.
        $this->update($order, ['items' => $items, 'schedules' => self::ORD_0011_SCHEDULES])
            ->assertSessionHasNoErrors()
            ->assertSessionHas('inertia.flash_data.toast', [
                'type' => 'warning',
                'message' => 'ORD-0011 diperbarui. Termin dihapus karena total berubah — atur ulang.',
            ]);

        $order = $this->ord0011();
        $this->assertSame(9_000_000, $order->total());
        $this->assertTrue($order->schedules->isEmpty());
        $this->assertSame('2026-10-18', $order->dueOn()->toDateString());
        $event = $order->events()->first();
        $this->assertEquals(['from' => 8_500_000, 'to' => 9_000_000], $event?->changes['total']);
        $this->assertNull($event?->changes['schedules']['to']);
    }

    public function test_updating_total_keeps_schedules_adjusted_to_new_total()
    {
        $order = $this->withOrd0011Schedules();
        $items = $order->items->map(fn (OrderItem $i) => ['id' => $i->id, 'catalog_item_id' => $i->catalog_item_id, 'quantity' => $i->quantity])->all();
        $items[] = ['name' => 'Drone', 'unit_price' => 500_000, 'quantity' => 1];
        $adjusted = self::ORD_0011_SCHEDULES;
        $adjusted[2]['amount'] = 2_200_000;

        $this->update($order, ['items' => $items, 'schedules' => $adjusted])
            ->assertSessionHasNoErrors()
            ->assertSessionHas('inertia.flash_data.toast.type', 'success');

        $this->assertSame([2_550_000, 4_250_000, 2_200_000], $this->ord0011()->schedules->pluck('amount')->all());
    }
}
