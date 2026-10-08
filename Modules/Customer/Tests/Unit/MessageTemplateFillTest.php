<?php

namespace Modules\Customer\Tests\Unit;

use Modules\Customer\Models\MessageTemplate;
use PHPUnit\Framework\TestCase;

class MessageTemplateFillTest extends TestCase
{
    public function test_fills_every_placeholder()
    {
        $this->assertSame(
            'Halo Budi, sisa ORD-0012: Rp 200.000 (Rp 200.000)',
            MessageTemplate::fillPlaceholders('Halo {nama}, sisa {nomor}: {sisa} ({sisa})', ['nama' => 'Budi', 'nomor' => 'ORD-0012', 'sisa' => 'Rp 200.000']),
        );
    }

    public function test_unknown_placeholder_and_bare_words_are_left_alone()
    {
        // "atas nama" tanpa kurung tidak tersentuh; {asing} dibiarkan agar terlihat di pratinjau.
        $this->assertSame(
            'Rekening atas nama Budi {asing}',
            MessageTemplate::fillPlaceholders('Rekening atas nama {nama} {asing}', ['nama' => 'Budi']),
        );
    }

    public function test_personalise_still_uses_first_name_and_link_for_email_blast()
    {
        $this->assertSame(
            'Halo Budi, link: https://x',
            MessageTemplate::personalise('Halo {nama}, link: {link}', 'Budi Santoso', 'https://x'),
        );
    }
}
