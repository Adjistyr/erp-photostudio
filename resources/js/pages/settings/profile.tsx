import { Form, Head, usePage } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import { Notice } from '@/components/page';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { edit } from '@/routes/profile';
import type { Auth } from '@/types';
import { send } from '@/routes/verification';

type PageProps = {
    auth: Auth;
};

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<PageProps>().props;

    return (
        <>
            <Head title="Pengaturan profil" />

            <h1 className="sr-only">Pengaturan profil</h1>

            <div className="flex flex-col gap-6">
                <Heading
                    variant="small"
                    title="Profil"
                    description="Ubah nama dan alamat email"
                />

                <Form
                    {...ProfileController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    className="flex flex-col gap-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <FieldGroup>
                                <Field>
                                    <FieldLabel htmlFor="name">Nama</FieldLabel>
                                    <Input
                                        id="name"
                                        defaultValue={auth.user.name}
                                        name="name"
                                        required
                                        autoComplete="name"
                                        placeholder="Nama lengkap"
                                        aria-invalid={Boolean(errors.name)}
                                    />
                                    <InputError message={errors.name} />
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="email">
                                        Alamat email
                                    </FieldLabel>
                                    <Input
                                        id="email"
                                        type="email"
                                        defaultValue={auth.user.email}
                                        name="email"
                                        required
                                        autoComplete="username"
                                        placeholder="Alamat email"
                                        aria-invalid={Boolean(errors.email)}
                                    />
                                    <InputError message={errors.email} />
                                </Field>
                            </FieldGroup>

                            {mustVerifyEmail &&
                                auth.user.email_verified_at === null && (
                                    <div className="flex flex-col gap-2">
                                        <Notice>
                                            Alamat email belum diverifikasi.{' '}
                                            <Link
                                                href={send()}
                                                as="button"
                                                className="font-medium text-foreground underline underline-offset-2"
                                            >
                                                Klik di sini untuk mengirim
                                                ulang email verifikasi.
                                            </Link>
                                        </Notice>

                                        {status ===
                                            'verification-link-sent' && (
                                            <p className="text-sm font-medium text-success">
                                                Link verifikasi baru sudah
                                                dikirim ke alamat email.
                                            </p>
                                        )}
                                    </div>
                                )}

                            <div>
                                <Button
                                    disabled={processing}
                                    data-test="update-profile-button"
                                >
                                    Simpan
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>

            {/* Owner tidak menghapus akunnya sendiri — selalu ada owner (spek 5.1). */}
            {auth.user.role !== 'owner' && <DeleteUser />}
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Pengaturan profil',
            href: edit(),
        },
    ],
};
