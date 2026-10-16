import { Form } from '@inertiajs/react';
import { TriangleAlert } from 'lucide-react';
import { useRef } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function DeleteUser() {
    const passwordInput = useRef<HTMLInputElement>(null);

    return (
        <div className="flex flex-col gap-6">
            <Heading
                variant="small"
                title="Hapus akun"
                description="Hapus akun beserta semua datanya"
            />
            <div className="flex flex-col items-start gap-4">
                <Alert variant="destructive">
                    <TriangleAlert />
                    <AlertTitle>Peringatan</AlertTitle>
                    <AlertDescription>
                        Lanjutkan dengan hati-hati, tindakan ini tidak bisa
                        dibatalkan.
                    </AlertDescription>
                </Alert>

                <Dialog>
                    <DialogTrigger
                        render={
                            <Button
                                variant="destructive"
                                data-test="delete-user-button"
                            />
                        }
                    >
                        Hapus akun
                    </DialogTrigger>
                    <DialogContent>
                        <DialogTitle>Yakin ingin menghapus akun?</DialogTitle>
                        <DialogDescription>
                            Setelah akun dihapus, semua data di dalamnya juga
                            akan terhapus permanen. Masukkan kata sandi untuk
                            mengonfirmasi penghapusan akun.
                        </DialogDescription>

                        <Form
                            {...ProfileController.destroy.form()}
                            options={{
                                preserveScroll: true,
                            }}
                            onError={() => passwordInput.current?.focus()}
                            resetOnSuccess
                            className="flex flex-col gap-6"
                        >
                            {({ resetAndClearErrors, processing, errors }) => (
                                <>
                                    <div className="flex flex-col gap-2">
                                        <Label
                                            htmlFor="password"
                                            className="sr-only"
                                        >
                                            Kata sandi
                                        </Label>

                                        <PasswordInput
                                            id="password"
                                            name="password"
                                            ref={passwordInput}
                                            placeholder="Kata sandi"
                                            autoComplete="current-password"
                                        />

                                        <InputError message={errors.password} />
                                    </div>

                                    <DialogFooter className="gap-2">
                                        <DialogClose
                                            render={
                                                <Button
                                                    variant="secondary"
                                                    onClick={() =>
                                                        resetAndClearErrors()
                                                    }
                                                />
                                            }
                                        >
                                            Batal
                                        </DialogClose>

                                        <Button
                                            type="submit"
                                            variant="destructive"
                                            disabled={processing}
                                            data-test="confirm-delete-user-button"
                                        >
                                            Hapus akun
                                        </Button>
                                    </DialogFooter>
                                </>
                            )}
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
