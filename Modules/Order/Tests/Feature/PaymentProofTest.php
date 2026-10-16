<?php

namespace Modules\Order\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Order\Models\Order;
use Modules\Order\Models\Payment;
use RuntimeException;
use Tests\TestCase;

/**
 * Lampiran bukti transfer/QRIS pada pembayaran (spek 6.7): disk privat,
 * dibuka lewat URL bertanda tangan untuk user login saja.
 */
class PaymentProofTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake(Payment::PROOF_DISK);
        $this->seed(DemoSeeder::class);
        $this->travelTo('2026-08-26 09:00:00');
        $this->actingAs(User::factory()->create());
    }

    private function order(string $number): Order
    {
        return Order::with(['items', 'payments'])->where('number', $number)->sole();
    }

    /** @param  array<string, mixed>  $data */
    private function pay(array $data): TestResponse
    {
        // ORD-0012: sisa 200 rb.
        return $this->from(route('orders.index'))->post(route('orders.payments.store', $this->order('ORD-0012')), [
            'amount' => 50_000, 'method' => 'transfer', 'paid_on' => '2026-08-26', ...$data,
        ]);
    }

    private function payWithProof(): Payment
    {
        $this->pay(['proof' => UploadedFile::fake()->image('mutasi.png')])->assertSessionHasNoErrors();

        return Payment::query()->latest('id')->firstOrFail();
    }

    public function test_transfer_payment_can_attach_proof(): void
    {
        $payment = $this->payWithProof();

        $this->assertNotNull($payment->proof_path);
        $this->assertStringStartsWith('payment-proofs/', $payment->proof_path);
        Storage::disk(Payment::PROOF_DISK)->assertExists($payment->proof_path);
        // Bukan disk publik.
        $this->assertFalse(Storage::disk('public')->exists($payment->proof_path));

        $this->get(route('orders.show', $payment->order_id))
            ->assertInertia(fn (Assert $page) => $page
                ->where('order.payments', fn ($payments) => collect($payments)->contains(
                    fn (array $p) => $p['id'] === $payment->id && str_contains((string) $p['proof_url'], 'signature=') && str_contains((string) $p['proof_url'], 'expires=')
                ))
            );
    }

    public function test_qris_payment_can_attach_pdf_proof(): void
    {
        $this->pay(['method' => 'qris', 'proof' => UploadedFile::fake()->create('mutasi.pdf', 100, 'application/pdf')])
            ->assertSessionHasNoErrors();

        $this->assertNotNull(Payment::query()->latest('id')->firstOrFail()->proof_path);
    }

    public function test_payment_without_proof_has_null_url(): void
    {
        $this->pay([])->assertSessionHasNoErrors();
        $payment = Payment::query()->latest('id')->firstOrFail();

        $this->assertFalse($payment->hasProof());
        $this->assertNull($payment->proofUrl());
    }

    public function test_cash_payment_rejects_proof(): void
    {
        $this->pay(['method' => 'cash', 'proof' => UploadedFile::fake()->image('mutasi.png')])
            ->assertSessionHasErrors('proof');

        $this->assertEmpty(Storage::disk(Payment::PROOF_DISK)->allFiles());
    }

    public function test_oversized_or_wrong_type_rejected(): void
    {
        $this->pay(['proof' => UploadedFile::fake()->create('mutasi.jpg', 3 * 1024, 'image/jpeg')])
            ->assertSessionHasErrors('proof');
        $this->pay(['proof' => UploadedFile::fake()->create('virus.exe', 10, 'application/x-msdownload')])
            ->assertSessionHasErrors('proof');

        $this->assertSame(1, $this->order('ORD-0012')->payments->count());
        $this->assertEmpty(Storage::disk(Payment::PROOF_DISK)->allFiles());
    }

    public function test_proof_route_requires_valid_signature_and_login(): void
    {
        $payment = $this->payWithProof();
        $signed = (string) $payment->proofUrl();

        $this->get($signed)->assertOk();
        $this->get(route('payments.proof', $payment))->assertForbidden();

        // Kedaluwarsa setelah 10 menit.
        $this->travel(11)->minutes();
        $this->get($signed)->assertForbidden();
        $this->travelBack();

        auth()->logout();
        $this->get(URL::temporarySignedRoute('payments.proof', now()->addMinutes(10), ['payment' => $payment->id]))
            ->assertRedirect(route('login'));
    }

    public function test_public_invoice_never_exposes_proof(): void
    {
        $payment = $this->payWithProof();
        $url = $payment->order->invoiceUrl();
        auth()->logout();

        $response = $this->get($url)->assertOk();
        $this->assertStringNotContainsString('payments/'.$payment->id.'/proof', $response->getContent());
        $this->assertStringNotContainsString('proof', $response->getContent());
    }

    public function test_deleting_payment_removes_file(): void
    {
        $payment = $this->payWithProof();
        $path = (string) $payment->proof_path;

        $this->from(route('orders.index'))
            ->delete(route('orders.payments.destroy', [$payment->order_id, $payment->id]))
            ->assertSessionHasNoErrors();

        $this->assertModelMissing($payment);
        Storage::disk(Payment::PROOF_DISK)->assertMissing($path);
    }

    public function test_file_delete_failure_is_logged_and_payment_still_deleted(): void
    {
        $payment = $this->payWithProof();
        $disk = Storage::disk(Payment::PROOF_DISK);
        $broken = \Mockery::mock($disk)->makePartial();
        $broken->shouldReceive('delete')->andThrow(new RuntimeException('disk penuh'));
        Storage::set(Payment::PROOF_DISK, $broken);
        Log::spy();

        $this->from(route('orders.index'))
            ->delete(route('orders.payments.destroy', [$payment->order_id, $payment->id]))
            ->assertRedirect(route('orders.index'));

        $this->assertModelMissing($payment);
        Log::shouldHaveReceived('warning')->once()->withArgs(fn (string $message) => str_contains($message, 'bukti pembayaran'));
    }
}
