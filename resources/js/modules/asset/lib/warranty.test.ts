import assert from 'node:assert/strict';
import { test } from 'vitest';

import { warrantyState } from '@/modules/asset/lib/warranty';

test('warrantyState: kosong, berlaku (termasuk hari ini), habis', () => {
    assert.equal(warrantyState(null, '2026-10-11'), null);
    assert.equal(warrantyState('2026-10-11', '2026-10-11'), 'active');
    assert.equal(warrantyState('2027-03-12', '2026-10-11'), 'active');
    assert.equal(warrantyState('2026-10-10', '2026-10-11'), 'expired');
});
