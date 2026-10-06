import { Camera } from 'lucide-react';

/**
 * Logo SEMENTARA — ikon kamera lucide sampai file logo Potrait Time tersedia.
 * Ganti isi komponen ini saja; semua pemakai (sidebar, halaman login)
 * mengikuti. Ikon garis: jangan beri kelas `fill-current` di pemanggil.
 */
export default function AppLogoIcon({ className }: { className?: string }) {
    return <Camera className={className} aria-hidden="true" />;
}
