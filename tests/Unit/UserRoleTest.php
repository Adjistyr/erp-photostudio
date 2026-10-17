<?php

namespace Tests\Unit;

use App\Enums\Ability;
use App\Enums\UserRole;
use PHPUnit\Framework\TestCase;

class UserRoleTest extends TestCase
{
    public function test_labels_and_owner_flag(): void
    {
        $this->assertSame(['Owner', 'Admin'], array_map(fn (UserRole $r) => $r->label(), UserRole::cases()));
        $this->assertTrue(UserRole::Owner->isOwner());
        $this->assertFalse(UserRole::Admin->isOwner());
    }

    public function test_ability_keys_are_snake_case_gate_names(): void
    {
        // Kunci `auth.can` di klien = nama Gate dengan `-` → `_`.
        $this->assertSame('view_finance', Ability::ViewFinance->key());
        $this->assertSame('record_operating_expense', Ability::RecordOperatingExpense->key());
    }
}
