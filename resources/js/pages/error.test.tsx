import assert from 'node:assert/strict';
import { test } from 'vitest';

import { ERROR_TEXT } from '@/pages/error';

test('teks error berbahasa Indonesia untuk tiap status yang dirender server', () => {
    for (const status of [403, 404, 500, 503]) {
        assert.ok(ERROR_TEXT[status].title.length > 0);
        assert.doesNotMatch(
            ERROR_TEXT[status].title,
            /Forbidden|Not Found|Server Error/,
        );
    }
});
