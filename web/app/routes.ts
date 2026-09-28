import { type RouteConfig, index, route } from "@react-router/dev/routes";

/**
 * Sepuluh module business-flow bagian 6, dipetakan ke route.
 *
 * Beberapa prompt layar tidak jadi route sendiri karena bentuk UI-nya memang
 * bukan halaman: Order Detail (4.7) dan Invoice Preview (4.15) adalah Sheet di
 * atas tabelnya, Dialog Tambah Item (4.2) dan Catat Pembayaran (4.10) adalah
 * Dialog. Membuatkan route untuk keduanya berarti owner kehilangan posisi
 * scroll dan filter setiap kali menutupnya (R9).
 *
 * Urutan di sini mengikuti grup sidebar, bukan urutan pengerjaan.
 */
export default [
  index("routes/dashboard.tsx"),
  route("pos", "routes/pos.tsx"),
  route("order", "routes/order.tsx"),
  route("order/baru", "routes/order-baru.tsx"),
  route("order/kalender", "routes/order-kalender.tsx"),
  route("pembayaran", "routes/pembayaran.tsx"),

  route("customer", "routes/customer.tsx"),
  route("katalog", "routes/katalog.tsx"),
  route("biaya", "routes/biaya.tsx"),

  route("invoice", "routes/invoice.tsx"),
  route("komunikasi", "routes/komunikasi.tsx"),
  route("laporan", "routes/laporan.tsx"),
  route("laporan/margin", "routes/laporan-margin.tsx"),
  route("laporan/penjualan", "routes/laporan-penjualan.tsx"),
  route("laporan/piutang", "routes/laporan-piutang.tsx"),
] satisfies RouteConfig;
