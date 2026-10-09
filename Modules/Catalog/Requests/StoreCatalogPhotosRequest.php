<?php

namespace Modules\Catalog\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;
use Modules\Catalog\Models\CatalogItem;
use Modules\Catalog\Models\CatalogItemPhoto;

/**
 * Unggah foto galeri (spek 7.1). Browser sudah mengecilkan ke ≤ 1600 px;
 * batas di sini pengaman bila langkah itu terlewati.
 */
class StoreCatalogPhotosRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'photos' => ['required', 'array', 'min:1', 'max:'.CatalogItemPhoto::MAX_PER_ITEM],
            // 2 MB = upload_max_filesize bawaan PHP. 4000 px = batas memori GD
            // (4000 × 4000 × 4 byte ≈ 64 MB dari memory_limit 128 MB).
            'photos.*' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048', 'dimensions:max_width=4000,max_height=4000'],
        ];
    }

    /** @return array<int, callable(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }
            /** @var CatalogItem $item */
            $item = $this->route('catalogItem');
            $left = CatalogItemPhoto::MAX_PER_ITEM - $item->photos()->count();
            /** @var array<int, mixed> $photos */
            $photos = $this->file('photos', []);
            if (count($photos) > $left) {
                $validator->errors()->add('photos', 'Maksimal '.CatalogItemPhoto::MAX_PER_ITEM." foto per item — sisa {$left} slot.");
            }
        }];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['photos' => 'foto', 'photos.*' => 'foto'];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        $format = 'Foto harus JPG, PNG, atau WebP.';

        return [
            'photos.*.image' => $format,
            'photos.*.mimes' => $format,
            'photos.*.max' => 'Foto maksimal 2 MB.',
            'photos.*.dimensions' => 'Foto maksimal 4000 × 4000 piksel.',
            // Ditolak PHP sebelum sampai ke Laravel (upload_max_filesize).
            'photos.*.uploaded' => 'Foto gagal diunggah — kemungkinan lebih dari 2 MB.',
        ];
    }
}
