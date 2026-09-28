/**
 * Layout shell — DESIGN.md R8 (blocker).
 *
 * Satu komponen untuk semua layar. Shell yang berbeda antar layar langsung
 * terasa sebagai app yang tidak selesai, dan itu kegagalan paling kentara di
 * mockup Stitch: 6 varian sidebar, dua nama brand, nol label grup. Di sini
 * sidebar didefinisikan sekali dan tidak ada layar yang bisa menyimpang.
 */

import { NavLink, useLocation } from "react-router";
import {
  CalendarDays,
  ChartColumn,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Package,
  Receipt,
  ShoppingCart,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "~/components/ui/sidebar";

/** Nama studio. Satu konstanta — di Stitch ini terbelah jadi dua nama. */
export const NAMA_STUDIO = "Studio Foto Agung";

interface ItemNav {
  label: string;
  ke: string;
  ikon: LucideIcon;
}

/**
 * Sepuluh module tidak muat sebagai daftar rata — pada 10 item mata kehilangan
 * tempat dan setiap navigasi jadi pencarian. Urutan DI DALAM grup mengikuti
 * frekuensi pakai harian, bukan nomor module di business-flow bagian 6.
 */
const GRUP_NAV: { label: string; item: ItemNav[] }[] = [
  {
    label: "Harian",
    item: [
      { label: "Dashboard", ke: "/", ikon: LayoutDashboard },
      { label: "POS", ke: "/pos", ikon: ShoppingCart },
      { label: "Order & Booking", ke: "/order", ikon: CalendarDays },
      { label: "Pembayaran", ke: "/pembayaran", ikon: Wallet },
    ],
  },
  {
    label: "Data",
    item: [
      { label: "Customer", ke: "/customer", ikon: Users },
      { label: "Katalog", ke: "/katalog", ikon: Package },
      { label: "Biaya", ke: "/biaya", ikon: Receipt },
    ],
  },
  {
    label: "Keluaran",
    item: [
      { label: "Invoice", ke: "/invoice", ikon: FileText },
      { label: "Komunikasi", ke: "/komunikasi", ikon: MessageSquare },
      { label: "Laporan", ke: "/laporan", ikon: ChartColumn },
    ],
  },
];

/**
 * Item nav aktif. "/" harus cocok persis, sisanya cocok sebagai prefiks segmen
 * supaya sub-halaman ikut menyalakan induknya — `/order/baru` menyalakan
 * "Order & Booking", `/laporan/margin` menyalakan "Laporan".
 *
 * Dibandingkan per SEGMEN, bukan `startsWith` telanjang: `startsWith("/order")`
 * juga cocok dengan hipotetis `/orderan` dan akan menyalakan menu yang salah.
 */
function aktif(pathname: string, ke: string): boolean {
  if (ke === "/") return pathname === "/";
  return pathname === ke || pathname.startsWith(`${ke}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <SidebarProvider
      // R8 minta collapsed 64px; bawaan shadcn 3rem (48px).
      style={{ "--sidebar-width-icon": "4rem" } as React.CSSProperties}
    >
      <Sidebar collapsible="icon">
        <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-4">
          <span className="truncate font-heading text-sm font-semibold group-data-[collapsible=icon]:hidden">
            {NAMA_STUDIO}
          </span>
        </SidebarHeader>
        <SidebarContent>
          {GRUP_NAV.map((grup, i) => (
            <SidebarGroup key={grup.label}>
              {i > 0 && <SidebarSeparator className="mb-2" />}
              <SidebarGroupLabel className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {grup.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {grup.item.map((item) => (
                    <SidebarMenuItem key={item.ke}>
                      {/*
                        `isActive` dihitung sendiri dari pathname, bukan
                        diandalkan dari NavLink. NavLink memang menyetel
                        aria-current="page" — semantiknya benar dan screen
                        reader membacanya — tapi SidebarMenuButton menata gaya
                        aktifnya dari prop `isActive` miliknya, jadi tanpa ini
                        item aktif tampil identik dengan sembilan item lain dan
                        penanda posisi yang diminta R8 hilang tanpa error apa
                        pun.
                      */}
                      <SidebarMenuButton
                        isActive={aktif(pathname, item.ke)}
                        tooltip={item.label}
                        render={
                          <NavLink to={item.ke} end={item.ke === "/"}>
                            <item.ikon />
                            <span>{item.label}</span>
                          </NavLink>
                        }
                      />
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
      </Sidebar>

      {/*
        min-w-0 di sini, bukan di dalam sidebar.tsx: SidebarInset bawaan shadcn
        `flex w-full flex-1 flex-col` tanpa min-w-0, jadi sebagai flex item ia
        menolak menyusut di bawah lebar kontennya dan tabel lebar mendorong
        seluruh halaman melebar — tombol di header halaman jadi terpotong di
        kanan. Ditambal di call site supaya `shadcn add --diff` nanti tidak
        bentrok dengan file komponen yang dimodifikasi.
      */}
      <SidebarInset className="min-w-0">{children}</SidebarInset>
    </SidebarProvider>
  );
}

/**
 * Header halaman — 56px, sticky, breadcrumb kiri + aksi utama kanan (R8).
 * `aksi` dibiarkan sebagai slot supaya tiap layar cuma menentukan tombolnya,
 * bukan ikut mendefinisikan tinggi dan posisinya.
 */
export function HeaderHalaman({
  judul,
  induk,
  aksi,
}: {
  judul: string;
  induk?: string;
  aksi?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b bg-background px-6">
      <SidebarTrigger className="-ml-2" />
      {/*
        Komponen Breadcrumb untuk jejak induk, bukan span + "/" buatan sendiri:
        komponennya sudah membawa `nav[aria-label]` dan `ol`, yang dibaca screen
        reader sebagai jalur navigasi — markup tangan terlihat sama tapi terbaca
        sebagai teks lepas.
        Judul halaman tetap `<h1>` terpisah, tidak dijadikan BreadcrumbPage:
        BreadcrumbPage merender span, dan halaman tanpa h1 kehilangan heading
        utamanya di navigasi berbasis heading.
      */}
      {induk && (
        <Breadcrumb className="min-w-0">
          <BreadcrumbList>
            <BreadcrumbItem>{induk}</BreadcrumbItem>
            <BreadcrumbSeparator />
          </BreadcrumbList>
        </Breadcrumb>
      )}
      <h1 className="truncate font-heading text-base font-semibold">{judul}</h1>
      {aksi && <div className="ml-auto flex items-center gap-2">{aksi}</div>}
    </header>
  );
}

/**
 * Bungkus konten halaman — padding 24px, lebar penuh tanpa max-width (R4).
 * Tabel ERP tidak dibatasi lebar: owner butuh sebanyak mungkin kolom terlihat
 * sekaligus, bukan kolom terpotong di tengah layar lebar.
 */
export function KontenHalaman({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-6 p-6">{children}</div>;
}
