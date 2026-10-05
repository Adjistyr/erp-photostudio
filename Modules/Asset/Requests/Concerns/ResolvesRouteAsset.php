<?php

namespace Modules\Asset\Requests\Concerns;

use Modules\Asset\Models\Asset;

/** Aset dari route model binding — aturan servis/status/lepas bergantung padanya. */
trait ResolvesRouteAsset
{
    public function asset(): Asset
    {
        $asset = $this->route('asset');
        if (! $asset instanceof Asset) {
            throw new \LogicException('Route tanpa aset');
        }

        return $asset;
    }
}
