/**
 * Settings → Pengguna (spek 5.1), hanya owner. Dua peran tetap: owner
 * melihat semua; admin mencatat transaksi harian. Tidak ada hapus — akun
 * staf yang keluar diganti sandinya. Aturan "minimal satu owner" dan "tidak
 * mengubah peran sendiri" dari server (UpdateUserRequest).
 */

import { Head, useForm, usePage } from '@inertiajs/react';
import { Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import UserController from '@/actions/App/Http/Controllers/Settings/UserController';
import { TabelData } from '@/components/data-table';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatTanggal } from '@/lib/format';
import { index as usersIndex } from '@/routes/users';
import type { UserRole } from '@/types';

interface UserRow {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    created_at: string | null;
}

interface RoleOption {
    value: UserRole;
    label: string;
}

export default function Users({
    users,
    roles,
}: {
    users: UserRow[];
    roles: RoleOption[];
}) {
    const { auth } = usePage().props;
    /** null = tertutup · 'new' = tambah · baris = ubah. */
    const [editing, setEditing] = useState<UserRow | 'new' | null>(null);

    return (
        <>
            <Head title="Pengguna" />
            <h1 className="sr-only">Pengguna</h1>

            <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <Heading
                        variant="small"
                        title="Pengguna"
                        description="Admin tidak melihat laporan, modal, margin, dan tidak bisa menghapus catatan uang."
                    />
                    <Button onClick={() => setEditing('new')}>
                        <Plus data-icon="inline-start" />
                        Tambah pengguna
                    </Button>
                </div>

                <TabelData>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nama</TableHead>
                            <TableHead>Peran</TableHead>
                            <TableHead>Dibuat</TableHead>
                            <TableHead />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((u) => (
                            <TableRow key={u.id}>
                                <TableCell>
                                    <div className="font-medium">
                                        {u.name}
                                        {u.id === auth.user.id && (
                                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                                                (Anda)
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {u.email}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant={
                                            u.role === 'owner'
                                                ? 'default'
                                                : 'secondary'
                                        }
                                    >
                                        {roles.find((r) => r.value === u.role)
                                            ?.label ?? u.role}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {u.created_at
                                        ? formatTanggal(u.created_at)
                                        : '—'}
                                </TableCell>
                                <TableCell>
                                    <span className="flex justify-end">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            aria-label={`Ubah ${u.name}`}
                                            onClick={() => setEditing(u)}
                                        >
                                            <Pencil />
                                        </Button>
                                    </span>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </TabelData>
            </div>

            {editing && (
                <UserDialog
                    key={editing === 'new' ? 'new' : editing.id}
                    user={editing === 'new' ? null : editing}
                    roles={roles}
                    onClose={() => setEditing(null)}
                />
            )}
        </>
    );
}

Users.layout = {
    breadcrumbs: [{ title: 'Pengguna', href: usersIndex() }],
};

interface UserForm {
    name: string;
    email: string;
    role: UserRole;
    password: string;
    password_confirmation: string;
}

/** Tambah (`user` null) atau ubah: nama, peran, sandi baru opsional. Email tetap. */
function UserDialog({
    user,
    roles,
    onClose,
}: {
    user: UserRow | null;
    roles: RoleOption[];
    onClose: () => void;
}) {
    const form = useForm<UserForm>({
        name: user?.name ?? '',
        email: user?.email ?? '',
        role: user?.role ?? 'admin',
        password: '',
        password_confirmation: '',
    });
    const { data, setData, errors, processing } = form;

    const submit = () => {
        const options = {
            preserveScroll: true,
            onSuccess: onClose,
            onFinish: () => form.reset('password', 'password_confirmation'),
        };
        if (user) {
            form.patch(UserController.update(user.id).url, options);
        } else {
            form.post(UserController.store().url, options);
        }
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {user ? `Ubah ${user.name}` : 'Tambah pengguna'}
                    </DialogTitle>
                    <DialogDescription>
                        {user
                            ? user.email
                            : 'Akun langsung aktif — berikan email dan sandi ke pemiliknya.'}
                    </DialogDescription>
                </DialogHeader>
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor="user-name">Nama</FieldLabel>
                        <Input
                            id="user-name"
                            maxLength={255}
                            autoComplete="off"
                            value={data.name}
                            aria-invalid={Boolean(errors.name)}
                            onChange={(e) => setData('name', e.target.value)}
                        />
                        <InputError message={errors.name} />
                    </Field>
                    {!user && (
                        <Field>
                            <FieldLabel htmlFor="user-email">Email</FieldLabel>
                            <Input
                                id="user-email"
                                type="email"
                                autoComplete="off"
                                value={data.email}
                                aria-invalid={Boolean(errors.email)}
                                onChange={(e) =>
                                    setData('email', e.target.value)
                                }
                            />
                            <InputError message={errors.email} />
                        </Field>
                    )}
                    <Field>
                        <FieldLabel htmlFor="user-role">Peran</FieldLabel>
                        <Select
                            items={roles}
                            value={data.role}
                            onValueChange={(v) => v && setData('role', v)}
                        >
                            <SelectTrigger id="user-role" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {roles.map((r) => (
                                        <SelectItem
                                            key={r.value}
                                            value={r.value}
                                        >
                                            {r.label}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <FieldDescription>
                            Admin: POS, order, pembayaran, biaya job, customer,
                            servis aset. Owner: semuanya.
                        </FieldDescription>
                        <InputError message={errors.role} />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                        <Field>
                            <FieldLabel htmlFor="user-password">
                                {user ? 'Sandi baru' : 'Sandi'}
                            </FieldLabel>
                            <PasswordInput
                                id="user-password"
                                autoComplete="new-password"
                                value={data.password}
                                aria-invalid={Boolean(errors.password)}
                                onChange={(e) =>
                                    setData('password', e.target.value)
                                }
                            />
                            {user && (
                                <FieldDescription>
                                    Kosongkan bila tidak diganti.
                                </FieldDescription>
                            )}
                            <InputError message={errors.password} />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="user-password-confirmation">
                                Ulangi sandi
                            </FieldLabel>
                            <PasswordInput
                                id="user-password-confirmation"
                                autoComplete="new-password"
                                value={data.password_confirmation}
                                onChange={(e) =>
                                    setData(
                                        'password_confirmation',
                                        e.target.value,
                                    )
                                }
                            />
                        </Field>
                    </div>
                </FieldGroup>
                <DialogFooter>
                    <DialogClose
                        render={<Button variant="outline">Batal</Button>}
                    />
                    <Button
                        disabled={
                            data.name.trim() === '' ||
                            (!user &&
                                (data.email.trim() === '' ||
                                    data.password === '')) ||
                            processing
                        }
                        onClick={submit}
                    >
                        Simpan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
