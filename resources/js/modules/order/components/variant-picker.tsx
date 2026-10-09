/**
 * Pilih varian produk di POS (spek 7.3). Satu ketukan tambahan hanya untuk
 * produk bervarian; memilih langsung menambah ke keranjang dan menutup.
 */

import { ProductPhoto } from '@/components/product-photo';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { formatRp } from '@/lib/format';

export interface PosVariant {
    id: number;
    name: string;
    price: number;
    unit_cost: number;
    /** Foto varian, atau sampul item (server). */
    photo_url: string | null;
}

export function VariantPicker({
    product,
    onPick,
    onClose,
}: {
    product: { name: string; variants: PosVariant[] } | null;
    onPick: (variant: PosVariant) => void;
    onClose: () => void;
}) {
    const withPhotos = product?.variants.some((v) => v.photo_url !== null);

    return (
        <Dialog open={product !== null} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-h-[90svh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{product?.name}</DialogTitle>
                    <DialogDescription>Pilih varian</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                    {product?.variants.map((v) => (
                        <button
                            key={v.id}
                            type="button"
                            onClick={() => onPick(v)}
                            className="flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                        >
                            {withPhotos && (
                                <ProductPhoto
                                    url={v.photo_url}
                                    className="mb-1 aspect-[4/3] w-full rounded-md"
                                />
                            )}
                            <span className="line-clamp-2 text-sm font-medium">
                                {v.name}
                            </span>
                            <span className="font-mono text-sm text-muted-foreground">
                                {formatRp(v.price)}
                            </span>
                        </button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
