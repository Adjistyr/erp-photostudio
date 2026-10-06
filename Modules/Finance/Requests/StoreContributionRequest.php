<?php

namespace Modules\Finance\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\Finance\Enums\ContributionDestination;
use Modules\Finance\Enums\ContributionKind;
use Modules\Finance\Rules\OpenPeriod;

/**
 * Setoran owner — bukan omzet, tidak memengaruhi laba (8.3). Pinjaman bisa
 * ke kas atau pos dana; modal lewat dialog ini selalu ke kas (modal untuk
 * renovasi/alat lewat Catat Investasi supaya investasinya ikut tercatat).
 */
class StoreContributionRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'owner_id' => ['required', 'integer', 'exists:owners,id'],
            'kind' => ['required', Rule::enum(ContributionKind::class)],
            'destination' => [
                Rule::requiredIf($this->input('kind') === ContributionKind::Loan->value),
                'nullable',
                Rule::in(array_map(fn (ContributionDestination $d) => $d->value, self::loanDestinations())),
            ],
            'amount' => ['required', 'integer', 'min:1'],
            'contributed_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:today', new OpenPeriod],
            'note' => ['nullable', 'string', 'max:255'],
        ];
    }

    /** @return list<ContributionDestination> */
    public static function loanDestinations(): array
    {
        return [ContributionDestination::Cash, ContributionDestination::MaintenanceFund, ContributionDestination::ReserveFund];
    }

    public function destination(): ContributionDestination
    {
        return $this->input('kind') === ContributionKind::Equity->value
            ? ContributionDestination::Cash
            : ContributionDestination::from((string) $this->input('destination'));
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'owner_id' => 'owner',
            'kind' => 'jenis',
            'destination' => 'tujuan',
            'amount' => 'nominal',
            'contributed_on' => 'tanggal',
            'note' => 'keterangan',
        ];
    }
}
