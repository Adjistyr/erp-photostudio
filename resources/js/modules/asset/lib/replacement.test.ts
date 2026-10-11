import assert from 'node:assert/strict';
import { test } from 'vitest';

import { replacementWhen } from '@/modules/asset/lib/replacement';

test('replacementWhen: lewat, bulan ini, akan datang', () => {
    assert.equal(replacementWhen(-3), 'lewat 3 bulan');
    assert.equal(replacementWhen(0), 'bulan ini');
    assert.equal(replacementWhen(4), '4 bulan lagi');
});
