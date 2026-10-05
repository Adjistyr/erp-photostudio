<?php

namespace Modules\Customer\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Customer\Mail\BlastMessage;
use Modules\Customer\Models\Customer;
use Modules\Customer\Models\MessageTemplate;
use Tests\TestCase;

/** Komunikasi — template, blast email (dikirim app), blast WA (disiapkan app). */
class CommunicationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoSeeder::class);
        $this->travelTo('2026-08-26 09:00:00');
        $this->actingAs(User::factory()->create());
    }

    public function test_guest_is_redirected_to_login()
    {
        auth()->logout();

        $this->get(route('communication.index'))->assertRedirect(route('login'));
    }

    public function test_index_lists_customers_and_default_templates()
    {
        $this->get(route('communication.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('customer::communication')
                ->has('customers', Customer::count())
                ->has('templates', 3)
                ->where('templates.0.key', 'promo')
                ->where('templates.0.body', MessageTemplate::defaults()['promo']['body'])
            );
    }

    public function test_owner_edits_template_and_it_is_kept()
    {
        $this->put(route('communication.templates.update', 'reminder'), ['body' => 'Halo {nama}, besok ya!'])
            ->assertRedirect(route('communication.index'))
            ->assertSessionHasNoErrors();

        $this->get(route('communication.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('templates.2.key', 'reminder')
                ->where('templates.2.body', 'Halo {nama}, besok ya!')
            );
    }

    public function test_template_validation_and_unknown_key()
    {
        $this->put(route('communication.templates.update', 'promo'), ['body' => ' '])->assertSessionHasErrors('body');
        $this->put(route('communication.templates.update', 'ulang-tahun'), ['body' => 'x'])->assertNotFound();
    }

    public function test_email_blast_personalises_first_name_and_skips_customers_without_email()
    {
        Mail::fake();
        $withEmail = Customer::whereNotNull('email')->orderBy('id')->firstOrFail();
        $withoutEmail = Customer::whereNull('email')->orderBy('id')->firstOrFail();

        $this->post(route('communication.email.send'), [
            'customer_ids' => [$withEmail->id, $withoutEmail->id],
            'subject' => 'Promo bulan ini',
            'body' => 'Halo {nama}! Ada promo.',
        ])->assertRedirect(route('communication.index'))->assertSessionHasNoErrors();

        $firstName = explode(' ', $withEmail->name)[0];
        Mail::assertSent(BlastMessage::class, fn (BlastMessage $m) => $m->hasTo((string) $withEmail->email)
            && $m->subjectLine === 'Promo bulan ini'
            && $m->body === "Halo {$firstName}! Ada promo.");
        Mail::assertSentCount(1);
    }

    public function test_email_blast_validation()
    {
        Mail::fake();

        $this->post(route('communication.email.send'), ['customer_ids' => [], 'subject' => '', 'body' => ''])
            ->assertSessionHasErrors(['customer_ids', 'subject', 'body']);
        $this->post(route('communication.email.send'), ['customer_ids' => [999_999], 'subject' => 'x', 'body' => 'x'])
            ->assertSessionHasErrors('customer_ids.0');

        Mail::assertNothingSent();
    }
}
