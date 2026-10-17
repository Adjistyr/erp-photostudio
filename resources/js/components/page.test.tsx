import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'vitest';

import { Panel } from '@/components/page';

test('panel tanpa judul memakai label sebagai nama section', () => {
    const html = renderToStaticMarkup(<Panel label="Daftar order">isi</Panel>);

    assert.match(html, /<section aria-label="Daftar order"/);
    assert.doesNotMatch(html, /<h2/);
});

test('panel berjudul dinamai judulnya, label diabaikan', () => {
    const html = renderToStaticMarkup(
        <Panel title="Piutang" label="Tidak terpakai">
            isi
        </Panel>,
    );

    assert.doesNotMatch(html, /aria-label/);
    assert.match(html, /<h2[^>]*>Piutang<\/h2>/);
});

test('aside tanpa judul tetap merender kepala panel tanpa heading', () => {
    const html = renderToStaticMarkup(<Panel aside="3 item">isi</Panel>);

    assert.match(html, /3 item/);
    assert.doesNotMatch(html, /<h2/);
});
