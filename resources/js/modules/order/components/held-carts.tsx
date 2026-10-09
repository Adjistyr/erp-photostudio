/**
 * Tahan / pulihkan / buang keranjang POS (spek 4.3). Daftar & aturannya di
 * `lib/held-carts.ts`; komponen ini hanya tampilan + konfirmasi.
 */

import { ChevronDown, Pause, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatRp } from '@/lib/format';
import { heldTotal, MAX_HELD } from '@/modules/order/lib/held-carts';
import type { HeldCart } from '@/modules/order/lib/held-carts';

/** Tombol Tahan di header keranjang; label bisa diubah sebelum ditahan. */
export function HoldCartButton({
    empty,
    full,
    defaultLabel,
    onHold,
}: {
    empty: boolean;
    full: boolean;
    defaultLabel: string;
    onHold: (label: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [label, setLabel] = useState('');

    if (full) {
        return (
            <Tooltip>
                {/* Tombol disabled tidak memicu hover — tooltip di pembungkus. */}
                <TooltipTrigger render={<span tabIndex={0} />}>
                    <Button size="sm" variant="outline" disabled>
                        <Pause data-icon="inline-start" />
                        Tahan
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    Maksimal {MAX_HELD} — buang salah satu dulu
                </TooltipContent>
            </Tooltip>
        );
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                setOpen(o);
                // Label default dihitung saat dibuka — nama/jam terkini.
                if (o) setLabel(defaultLabel);
            }}
        >
            <DialogTrigger
                render={<Button size="sm" variant="outline" disabled={empty} />}
            >
                <Pause data-icon="inline-start" />
                Tahan
            </DialogTrigger>
            <DialogContent>
                <form
                    className="flex flex-col gap-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        onHold(label);
                        setOpen(false);
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>Tahan keranjang</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="held_label" className="text-sm">
                            Label
                        </label>
                        <Input
                            id="held_label"
                            autoFocus
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose render={<Button variant="outline" />}>
                            Batal
                        </DialogClose>
                        <Button type="submit">Tahan</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Daftar keranjang tertahan. Memulihkan saat keranjang aktif berisi minta
 * keputusan dulu: tahan keranjang sekarang, atau buang.
 */
export function HeldCarts({
    carts,
    products,
    cartActive,
    onRestore,
    onDrop,
}: {
    carts: HeldCart[];
    products: { id: number; price: number }[];
    /** Keranjang aktif berisi item. */
    cartActive: boolean;
    /** `holdCurrent`: keranjang aktif ditahan dulu (true) atau dibuang (false). */
    onRestore: (cart: HeldCart, holdCurrent: boolean) => void;
    onDrop: (id: string) => void;
}) {
    const [pending, setPending] = useState<HeldCart | null>(null);

    if (carts.length === 0) return null;

    return (
        <>
            <Collapsible defaultOpen className="rounded-lg border">
                <CollapsibleTrigger
                    render={
                        <Button
                            variant="ghost"
                            className="group w-full justify-between rounded-lg px-4"
                        />
                    }
                >
                    <span className="text-sm">Ditahan ({carts.length})</span>
                    <ChevronDown className="transition-transform group-data-[panel-open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <ul className="flex flex-col divide-y border-t text-sm">
                        {carts.map((c) => (
                            <li
                                key={c.id}
                                className="flex items-center gap-2 px-4 py-2"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium">
                                        {c.label}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(c.heldAt)
                                            .toTimeString()
                                            .slice(0, 5)}{' '}
                                        ·{' '}
                                        {c.items.reduce(
                                            (s, i) => s + i.quantity,
                                            0,
                                        )}{' '}
                                        item ·{' '}
                                        <span className="font-mono">
                                            ±{formatRp(heldTotal(c, products))}
                                        </span>
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        cartActive
                                            ? setPending(c)
                                            : onRestore(c, false)
                                    }
                                >
                                    Pulihkan
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger
                                        render={
                                            <Button
                                                size="icon-sm"
                                                variant="ghost"
                                                aria-label={`Buang ${c.label}`}
                                            />
                                        }
                                    >
                                        <Trash2 />
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>
                                                Buang “{c.label}”?
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Keranjang ini belum jadi
                                                transaksi — isinya hilang dan
                                                tidak bisa dikembalikan.
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
                                                onClick={() => onDrop(c.id)}
                                            >
                                                Buang
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </li>
                        ))}
                    </ul>
                </CollapsibleContent>
            </Collapsible>

            <AlertDialog
                open={pending !== null}
                onOpenChange={(o) => {
                    if (!o) setPending(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Keranjang sekarang ditahan dulu?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            “{pending?.label}” akan menggantikan keranjang yang
                            sedang diisi.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            render={<Button variant="outline" />}
                        >
                            Batal
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="outline"
                            onClick={() => {
                                if (pending) onRestore(pending, false);
                                setPending(null);
                            }}
                        >
                            Buang lalu pulihkan
                        </AlertDialogAction>
                        <AlertDialogAction
                            onClick={() => {
                                if (pending) onRestore(pending, true);
                                setPending(null);
                            }}
                        >
                            Tahan lalu pulihkan
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
