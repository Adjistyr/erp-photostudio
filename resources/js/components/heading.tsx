/**
 * Judul bagian (h2). Varian `default` memakai tipografi judul halaman
 * (PageHeader) untuk layout yang halamannya sudah punya h1 sendiri —
 * Pengaturan; `small` untuk sub-bagian di dalam panel.
 */
export default function Heading({
    title,
    description,
    variant = 'default',
}: {
    title: string;
    description?: string;
    variant?: 'default' | 'small';
}) {
    return (
        <header
            className={variant === 'small' ? '' : 'mb-6 flex flex-col gap-1'}
        >
            <h2
                className={
                    variant === 'small'
                        ? 'mb-0.5 text-base font-medium'
                        : 'text-[28px] leading-[1.15] font-medium tracking-[-0.02em] md:text-[34px]'
                }
            >
                {title}
            </h2>
            {description && (
                <p
                    className={
                        variant === 'small'
                            ? 'text-sm text-muted-foreground'
                            : 'text-[15px] text-muted-foreground'
                    }
                >
                    {description}
                </p>
            )}
        </header>
    );
}
