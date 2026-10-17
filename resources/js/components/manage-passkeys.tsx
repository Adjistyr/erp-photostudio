import { router } from '@inertiajs/react';
import { KeyRound } from 'lucide-react';
import { destroy } from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyRegistrationController';
import Heading from '@/components/heading';
import PasskeyItem from '@/components/passkey-item';
import PasskeyRegistration from '@/components/passkey-register';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import type { Passkey } from '@/types/auth';

export type Props = {
    canManagePasskeys?: boolean;
    passkeys?: Passkey[];
};

export default function ManagePasskeys(props: Props) {
    const passkeys = props.passkeys ?? [];

    const handleDelete = (id: number, onError: () => void) => {
        router.delete(destroy.url(id), {
            preserveScroll: true,
            onError,
        });
    };

    if (!(props.canManagePasskeys ?? false)) {
        return null;
    }

    return (
        <div className="flex flex-col gap-6">
            <Heading
                variant="small"
                title="Passkey"
                description="Kelola passkey untuk masuk tanpa kata sandi"
            />

            {/* Isi bersarang di Panel putih: blok abu `--muted` tanpa garis,
                bukan kotak bergaris (DESIGN.md "Konvensi halaman"). */}
            {passkeys.length > 0 ? (
                <div className="overflow-hidden rounded-2xl bg-muted">
                    {passkeys.map((passkey) => (
                        <PasskeyItem
                            key={passkey.id}
                            passkey={passkey}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            ) : (
                <Empty className="rounded-2xl bg-muted p-8">
                    <EmptyHeader>
                        <EmptyMedia variant="icon" className="bg-card">
                            <KeyRound className="text-muted-foreground" />
                        </EmptyMedia>
                        <EmptyTitle>Belum ada passkey</EmptyTitle>
                        <EmptyDescription>
                            Tambahkan passkey untuk masuk tanpa kata sandi
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            )}

            <div>
                <PasskeyRegistration onSuccess={() => router.reload()} />
            </div>
        </div>
    );
}
