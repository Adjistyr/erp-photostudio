/**
 * Galeri foto item di halaman Edit Katalog (spek 7.1, halaman sejak 7.2).
 * Setiap aksi langsung tersimpan ke server — tidak menunggu tombol Simpan.
 *
 * Kunjungan memakai `preserveState`: tanpa itu halaman di-reset setiap kali
 * foto ditambah/dihapus dan isian form yang belum disimpan hilang.
 */

import { router } from '@inertiajs/react';
import { ImagePlus, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import CatalogPhotoController from '@/actions/Modules/Catalog/Controllers/CatalogPhotoController';
import InputError from '@/components/input-error';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
    MAX_PHOTOS,
    resizeForUpload,
} from '@/modules/catalog/lib/photo-resize';

export interface CatalogPhoto {
    id: number;
    url: string;
    thumb_url: string;
}

const VISIT = { preserveScroll: true, preserveState: true } as const;

export function PhotoGallery({
    itemId,
    itemName,
    photos,
}: {
    itemId: number;
    itemName: string;
    /** Sampul dulu (urutan server). */
    photos: CatalogPhoto[];
}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | undefined>();
    const left = MAX_PHOTOS - photos.length;

    const upload = async (list: FileList | null) => {
        const files = Array.from(list ?? []);
        if (files.length === 0) return;
        if (files.length > left) {
            setError(
                `Maksimal ${MAX_PHOTOS} foto per item — sisa ${left} slot.`,
            );
            return;
        }
        setError(undefined);
        setBusy(true);
        let resized: File[];
        try {
            resized = await Promise.all(files.map(resizeForUpload));
        } catch {
            setBusy(false);
            setError('Ada file yang bukan gambar atau tidak bisa dibaca.');
            return;
        }
        router.post(
            CatalogPhotoController.store(itemId).url,
            { photos: resized },
            {
                ...VISIT,
                forceFormData: true,
                // Error per file berkunci "photos.0" — tampilkan yang pertama.
                onError: (errors) =>
                    setError(
                        Object.entries(errors).find(([k]) =>
                            k.startsWith('photos'),
                        )?.[1],
                    ),
                onFinish: () => setBusy(false),
            },
        );
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium">Foto</span>
                <span className="text-xs text-muted-foreground">
                    {photos.length}/{MAX_PHOTOS} · tersimpan langsung
                </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
                {photos.map((p, i) => (
                    <div
                        key={p.id}
                        className="relative aspect-square overflow-hidden rounded-md border"
                    >
                        <img
                            src={p.thumb_url}
                            alt={`Foto ${i + 1} ${itemName}`}
                            className="size-full object-cover"
                        />
                        {i === 0 && (
                            <Badge className="absolute top-1 left-1">
                                Sampul
                            </Badge>
                        )}
                        {/* Selalu terlihat — layar sentuh tidak punya hover. */}
                        <div className="absolute right-1 bottom-1 flex gap-1">
                            {i > 0 && (
                                <Button
                                    size="icon-xs"
                                    variant="secondary"
                                    aria-label={`Jadikan foto ${i + 1} sampul`}
                                    title="Jadikan sampul"
                                    onClick={() =>
                                        router.patch(
                                            CatalogPhotoController.cover({
                                                catalogItem: itemId,
                                                photo: p.id,
                                            }).url,
                                            {},
                                            VISIT,
                                        )
                                    }
                                >
                                    <Star />
                                </Button>
                            )}
                            <AlertDialog>
                                <AlertDialogTrigger
                                    render={
                                        <Button
                                            size="icon-xs"
                                            variant="secondary"
                                            aria-label={`Hapus foto ${i + 1}`}
                                        />
                                    }
                                >
                                    <Trash2 />
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>
                                            Hapus foto {i + 1}?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            File fotonya ikut dihapus dan tidak
                                            bisa dikembalikan.
                                            {i === 0 &&
                                                ' Foto berikutnya otomatis jadi sampul.'}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel
                                            render={
                                                <Button variant="outline" />
                                            }
                                        >
                                            Batal
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            variant="destructive"
                                            onClick={() =>
                                                router.delete(
                                                    CatalogPhotoController.destroy(
                                                        {
                                                            catalogItem: itemId,
                                                            photo: p.id,
                                                        },
                                                    ).url,
                                                    VISIT,
                                                )
                                            }
                                        >
                                            Hapus
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                ))}
                {left > 0 && (
                    <label
                        className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed text-center text-xs text-muted-foreground transition-colors focus-within:ring-2 focus-within:ring-ring ${busy ? 'pointer-events-none opacity-60' : 'cursor-pointer hover:bg-accent'}`}
                    >
                        {busy ? <Spinner /> : <ImagePlus className="size-5" />}
                        {busy ? 'Mengunggah…' : 'Tambah foto'}
                        {/* accept eksplisit: iOS mengonversi HEIC ke JPEG. */}
                        <input
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            disabled={busy}
                            onChange={(e) => {
                                void upload(e.target.files);
                                // Pilih file yang sama lagi tetap memicu onChange.
                                e.target.value = '';
                            }}
                        />
                    </label>
                )}
            </div>
            <p className="text-xs text-muted-foreground">
                Foto pertama jadi sampul di POS dan daftar Katalog. JPG, PNG,
                atau WebP; foto dikecilkan otomatis.
            </p>
            <InputError message={error} />
        </div>
    );
}
