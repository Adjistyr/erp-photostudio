<?php

namespace Modules\Asset\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use Modules\Asset\Enums\AssetPhotoKind;
use Modules\Asset\Requests\Concerns\ResolvesRouteAsset;

/**
 * Unggah foto alat / nota (spek 8.2). Browser sudah mengecilkan gambar;
 * batas di sini pengaman. PDF hanya untuk nota & garansi.
 */
class StoreAssetPhotosRequest extends FormRequest
{
    use ResolvesRouteAsset;

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $receipt = $this->input('kind') === AssetPhotoKind::Receipt->value;

        return [
            'kind' => ['required', Rule::enum(AssetPhotoKind::class)],
            'photos' => ['required', 'array', 'min:1', 'max:8'],
            // 2 MB = upload_max_filesize bawaan PHP; 4000 px = batas memori GD.
            // `dimensions` hanya untuk gambar — PDF nota tidak punya dimensi.
            'photos.*' => $receipt
                ? ['required', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:2048']
                : ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048', 'dimensions:max_width=4000,max_height=4000'],
        ];
    }

    /** @return array<int, callable(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }
            $kind = $this->kind();
            $left = $kind->max() - $this->asset()->photos()->where('kind', $kind)->count();
            /** @var array<int, mixed> $files */
            $files = $this->file('photos', []);
            if (count($files) > $left) {
                $validator->errors()->add('photos', "Maksimal {$kind->max()} {$kind->label()} per aset — sisa {$left} slot.");
            }
        }];
    }

    public function kind(): AssetPhotoKind
    {
        return AssetPhotoKind::from((string) $this->input('kind'));
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['photos' => 'foto', 'photos.*' => 'foto', 'kind' => 'jenis foto'];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        $receipt = $this->input('kind') === AssetPhotoKind::Receipt->value;
        $format = $receipt ? 'Nota harus JPG, PNG, WebP, atau PDF.' : 'Foto alat harus JPG, PNG, atau WebP.';

        return [
            'photos.*.image' => $format,
            'photos.*.file' => $format,
            'photos.*.mimes' => $format,
            'photos.*.max' => 'File maksimal 2 MB.',
            'photos.*.dimensions' => 'Foto maksimal 4000 × 4000 piksel.',
            // Ditolak PHP sebelum sampai ke Laravel (upload_max_filesize).
            'photos.*.uploaded' => 'File gagal diunggah — kemungkinan lebih dari 2 MB.',
        ];
    }
}
