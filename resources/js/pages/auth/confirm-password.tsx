import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/password/confirm';
import {
    index as confirmOptions,
    store as confirmStore,
} from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyConfirmationController';
import PasskeyVerify from '@/components/passkey-verify';

export default function ConfirmPassword() {
    return (
        <>
            <Head title="Konfirmasi kata sandi" />

            <PasskeyVerify
                routes={{
                    options: confirmOptions(),
                    submit: confirmStore(),
                }}
                label="Konfirmasi dengan passkey"
                loadingLabel="Mengonfirmasi..."
                separator="Atau konfirmasi dengan kata sandi"
            />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <Field>
                            <FieldLabel htmlFor="password">
                                Kata sandi
                            </FieldLabel>
                            <PasswordInput
                                id="password"
                                name="password"
                                placeholder="Kata sandi"
                                autoComplete="current-password"
                                autoFocus
                                aria-invalid={Boolean(errors.password)}
                            />
                            <InputError message={errors.password} />
                        </Field>

                        <Button
                            className="w-full"
                            disabled={processing}
                            data-test="confirm-password-button"
                        >
                            {processing && <Spinner />}
                            Konfirmasi kata sandi
                        </Button>
                    </>
                )}
            </Form>
        </>
    );
}

ConfirmPassword.layout = {
    title: 'Konfirmasi kata sandi',
    description:
        'Ini area aman aplikasi. Konfirmasi kata sandi dulu sebelum lanjut.',
};
