import assert from 'node:assert/strict';
import { test } from 'vitest';

import { defaultDueBack } from '@/modules/asset/lib/checkout';

test('defaultDueBack: tanggal order, tidak sebelum tanggal keluar', () => {
    assert.equal(defaultDueBack('2026-10-15', '2026-10-11'), '2026-10-15');
    assert.equal(defaultDueBack('2026-10-11', '2026-10-11'), '2026-10-11');
    // Order sudah lewat → pakai tanggal keluar.
    assert.equal(defaultDueBack('2026-10-10', '2026-10-11'), '2026-10-11');
});
