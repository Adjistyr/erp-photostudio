import { Form, Head } from '@inertiajs/react';
import { useRef } from 'react';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { edit } from '@/routes/security';
import type { Props as ManagePasskeysProps } from '@/components/manage-passkeys';
import ManagePasskeys from '@/components/manage-passkeys';
import type { Props as ManageTwoFactorProps } from '@/components/manage-two-factor';
import ManageTwoFactor from '@/components/manage-two-factor';

// oxfmt-ignore
type Props = {
    passwordRules: string;
} & ManagePasskeysProps &
    ManageTwoFactorProps;

export default function Security(props: Props) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <>
            <Head title="Pengaturan keamanan" />

            <h1 className="sr-only">Pengaturan keamanan</h1>

            <div className="flex flex-col gap-6">
                <Heading
                    variant="small"
                    title="Ubah kata sandi"
                    description="Gunakan kata sandi yang panjang dan acak agar akun tetap aman"
                />

                <Form
                    {...SecurityController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    resetOnError={[
                        'password',
                        'password_confirmation',
                        'current_password',
                    ]}
                    resetOnSuccess
                    onError={(errors) => {
                        if (errors.password) {
                            passwordInput.current?.focus();
                        }

                        if (errors.current_password) {
                            currentPasswordInput.current?.focus();
                        }
                    }}
                    className="flex flex-col gap-6"
                >
                    {({ errors, processing }) => (
                        <>
                            <FieldGroup>
                                <Field>
                                    <FieldLabel htmlFor="current_password">
                                        Kata sandi saat ini
                                    </FieldLabel>
                                    <PasswordInput
                                        id="current_password"
                                        ref={currentPasswordInput}
                                        name="current_password"
                                        autoComplete="current-password"
                                        placeholder="Kata sandi saat ini"
                                        aria-invalid={Boolean(
                                            errors.current_password,
                                        )}
                                    />
                                    <InputError
                                        message={errors.current_password}
                                    />
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="password">
                                        Kata sandi baru
                                    </FieldLabel>
                                    <PasswordInput
                                        id="password"
                                        ref={passwordInput}
                                        name="password"
                                        autoComplete="new-password"
                                        placeholder="Kata sandi baru"
                                        passwordrules={props.passwordRules}
                                        aria-invalid={Boolean(errors.password)}
                                    />
                                    <InputError message={errors.password} />
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="password_confirmation">
                                        Konfirmasi kata sandi
                                    </FieldLabel>
                                    <PasswordInput
                                        id="password_confirmation"
                                        name="password_confirmation"
                                        autoComplete="new-password"
                                        placeholder="Konfirmasi kata sandi"
                                        passwordrules={props.passwordRules}
                                        aria-invalid={Boolean(
                                            errors.password_confirmation,
                                        )}
                                    />
                                    <InputError
                                        message={errors.password_confirmation}
                                    />
                                </Field>
                            </FieldGroup>

                            <div>
                                <Button
                                    disabled={processing}
                                    data-test="update-password-button"
                                >
                                    Simpan
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>

            <ManageTwoFactor
                canManageTwoFactor={props.canManageTwoFactor}
                requiresConfirmation={props.requiresConfirmation}
                twoFactorEnabled={props.twoFactorEnabled}
            />

            <ManagePasskeys
                canManagePasskeys={props.canManagePasskeys}
                passkeys={props.passkeys}
            />
        </>
    );
}

Security.layout = {
    breadcrumbs: [
        {
            title: 'Pengaturan keamanan',
            href: edit(),
        },
    ],
};
