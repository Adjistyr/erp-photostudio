import assert from 'node:assert/strict';
import { test } from 'vitest';

import { categoryMatches } from './category';

test('Add-on muncul di studio maupun event', () => {
    assert.equal(categoryMatches('Add-on', 'studio'), true);
    assert.equal(categoryMatches('Add-on', 'event'), true);
});

test('Studio hanya di order studio', () => {
    assert.equal(categoryMatches('Studio', 'studio'), true);
    assert.equal(categoryMatches('Studio', 'event'), false);
});

test('Event hanya di order event', () => {
    assert.equal(categoryMatches('Event', 'event'), true);
    assert.equal(categoryMatches('Event', 'studio'), false);
});
