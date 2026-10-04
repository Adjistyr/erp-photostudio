<?php

namespace App\Enums;

/**
 * Status kerja — diinput manual (business-flow bagian 4). Status bayar TIDAK
 * ada di sini: ia selalu diturunkan dari pembayaran, lihat PaymentStatus.
 */
enum WorkStatus: string
{
    case Booking = 'booking';
    case Scheduled = 'scheduled';
    case InProgress = 'in_progress';
    case Done = 'done';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';

    /**
     * Langkah berikutnya — hanya maju satu langkah, tidak ada mundur. Mundur
     * itu koreksi kesalahan yang jarang di skala satu pengguna; menyediakannya
     * berarti mendesain alur pembatalan-status yang belum tentu dibutuhkan.
     */
    public function next(): ?self
    {
        return match ($this) {
            self::Booking => self::Scheduled,
            self::Scheduled => self::InProgress,
            self::InProgress => self::Done,
            self::Done => self::Delivered,
            self::Delivered, self::Cancelled => null,
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Booking => 'Booking',
            self::Scheduled => 'Dijadwalkan',
            self::InProgress => 'Dikerjakan',
            self::Done => 'Selesai Dikerjakan',
            self::Delivered => 'Diserahkan',
            self::Cancelled => 'Batal',
        };
    }

    /** Link hasil foto baru ada setelah editing selesai. */
    public function allowsResultLink(): bool
    {
        return $this === self::Done || $this === self::Delivered;
    }
}
