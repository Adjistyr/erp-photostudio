/**
 * Galeri foto generik — katalog (spek 7.1/7.2) dan aset (spek 8.2). Setiap
 * aksi langsung tersimpan ke server — tidak menunggu tombol Simpan.
 *
 * Kunjungan memakai `preserveState`: tanpa itu halaman di-reset setiap kali
 * foto ditambah/dihapus dan isian form yang belum disimpan hilang.
 *
 * URL unggah/hapus/sampul datang dari pemakai, supaya satu komponen melayani
 * dua modul tanpa saling mengimpor route modul lain.
 */

import { router } from '@inertiajs/react';
import { FileText, ImagePlus, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
import { resizeForUpload } from '@/lib/photo-resize';

export interface GalleryPhoto {
    id: number;
    url: string;
    /** null untuk PDF (nota aset). */
    thumb_url: string | null;
    is_pdf?: boolean;
    /** Nama file asli — ditampilkan untuk PDF. */
    name?: string;
}

const VISIT = { preserveScroll: true, preserveState: true } as const;
const IMAGES = 'image/jpeg,image/png,image/webp';

export function PhotoGallery({
    title = 'Foto',
    itemName,
    photos,
    max,
    uploadUrl,
    uploadData = {},
    deleteUrl,
    coverUrl,
    allowPdf = false,
    readOnly = false,
    hint,
}: {
    title?: string;
    itemName: string;
    /** Sampul dulu (urutan server). */
    photos: GalleryPhoto[];
    max: number;
    uploadUrl: string;
    /** Field tambahan saat unggah, mis. `{ kind: 'receipt' }`. */
    uploadData?: Record<string, string>;
    deleteUrl: (photoId: number) => string;
    /** Tanpa ini tidak ada sampul (mis. nota). */
    coverUrl?: (photoId: number) => string;
    /** Nota boleh PDF — dikirim apa adanya, tidak dikecilkan. */
    allowPdf?: boolean;
    /** Lihat saja — tanpa unggah, sampul, hapus (pengguna tanpa hak kelola, spek 5.1). */
    readOnly?: boolean;
    hint: string;
}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | undefined>();
    const left = max - photos.length;

    const upload = async (list: FileList | null) => {
        const files = Array.from(list ?? []);
        if (files.length === 0) return;
        if (files.length > left) {
            setError(`Maksimal ${max} file — sisa ${left} slot.`);
            return;
        }
        setError(undefined);
        setBusy(true);
        let prepared: File[];
        try {
            prepared = await Promise.all(
                files.map(async (f) =>
                    f.type === 'application/pdf' ? f : resizeForUpload(f),
                ),
            );
        } catch {
            setBusy(false);
            setError('Ada file yang bukan gambar atau tidak bisa dibaca.');
            return;
        }
        router.post(
            uploadUrl,
            { ...uploadData, photos: prepared },
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
                <span className="text-sm font-medium">{title}</span>
                <span className="text-xs text-muted-foreground">
                    {photos.length}/{max}
                    {readOnly ? '' : ' · tersimpan langsung'}
                </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
                {photos.map((p, i) => (
                    <div
                        key={p.id}
                        className="relative aspect-square overflow-hidden rounded-md border"
                    >
                        {/* Buka ukuran penuh di tab baru — nota perlu dibaca utuh. */}
                        <a
                            href={p.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block size-full"
                            title={p.name}
                        >
                            {p.thumb_url ? (
                                <img
                                    src={p.thumb_url}
                                    alt={`${title} ${i + 1} ${itemName}`}
                                    className="size-full object-cover"
                                />
                            ) : (
                                <span className="flex size-full flex-col items-center justify-center gap-1 bg-muted p-2 text-center text-xs text-muted-foreground">
                                    <FileText className="size-6" />
                                    <span className="line-clamp-2 break-all">
                                        {p.name ?? 'PDF'}
                                    </span>
                                </span>
                            )}
                        </a>
                        {coverUrl && i === 0 && (
                            <Badge className="absolute top-1 left-1">
                                Sampul
                            </Badge>
                        )}
                        {/* Selalu terlihat — layar sentuh tidak punya hover. */}
                        {!readOnly && (
                            <div className="absolute right-1 bottom-1 flex gap-1">
                                {coverUrl && i > 0 && (
                                    <Button
                                        size="icon-xs"
                                        variant="secondary"
                                        aria-label={`Jadikan foto ${i + 1} sampul`}
                                        title="Jadikan sampul"
                                        onClick={() =>
                                            router.patch(
                                                coverUrl(p.id),
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
                                                aria-label={`Hapus ${title.toLowerCase()} ${i + 1}`}
                                            />
                                        }
                                    >
                                        <Trash2 />
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>
                                                Hapus {title.toLowerCase()}{' '}
                                                {i + 1}?
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Filenya ikut dihapus dan tidak
                                                bisa dikembalikan.
                                                {coverUrl &&
                                                    i === 0 &&
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
                                                        deleteUrl(p.id),
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
                        )}
                    </div>
                ))}
                {!readOnly && left > 0 && (
                    <label
                        className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed text-center text-xs text-muted-foreground transition-colors focus-within:ring-2 focus-within:ring-ring ${busy ? 'pointer-events-none opacity-60' : 'cursor-pointer hover:bg-accent'}`}
                    >
                        {busy ? <Spinner /> : <ImagePlus className="size-5" />}
                        {busy ? 'Mengunggah…' : 'Tambah'}
                        {/* accept eksplisit: iOS mengonversi HEIC ke JPEG. */}
                        <input
                            type="file"
                            multiple
                            accept={
                                allowPdf ? `${IMAGES},application/pdf` : IMAGES
                            }
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
            <p className="text-xs text-muted-foreground">{hint}</p>
            <InputError message={error} />
        </div>
    );
}
