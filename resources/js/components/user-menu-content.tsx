import { Link, router } from '@inertiajs/react';
import { LogOut, Settings } from 'lucide-react';
import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { logout } from '@/routes';
import { edit } from '@/routes/profile';
import type { User } from '@/types';

type Props = {
    user: User;
};

export function UserMenuContent({ user }: Props) {
    const cleanup = useMobileNavigation();

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    return (
        <>
            {/* Base UI: label menu adalah Menu.GroupLabel dan WAJIB di dalam
                Group — di luar Group menu langsung crash (Radix membolehkan
                label berdiri sendiri, jadi ini tidak tertangkap typecheck). */}
            <DropdownMenuGroup>
                <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                        <UserInfo user={user} showEmail={true} />
                    </div>
                </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                <DropdownMenuItem
                    render={
                        <Link
                            className="block w-full cursor-pointer"
                            href={edit()}
                            prefetch
                            onClick={cleanup}
                        />
                    }
                >
                    <Settings className="mr-2" />
                    Pengaturan
                </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {/* Logout merender <button> asli (Link as="button", karena POST),
                jadi nativeButton wajib true — kalau tidak, Base UI menimpa
                semantik button dengan role/aria buatan. */}
            <DropdownMenuItem
                nativeButton
                render={
                    <Link
                        className="block w-full cursor-pointer"
                        href={logout()}
                        as="button"
                        onClick={handleLogout}
                        data-test="logout-button"
                    />
                }
            >
                <LogOut className="mr-2" />
                Keluar
            </DropdownMenuItem>
        </>
    );
}
