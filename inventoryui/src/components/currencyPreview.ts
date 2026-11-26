// src/utils/currencyPreview.ts
const RATES_CACHE_KEY = 'pavlovit_usd_rates_cache_v1';
const RATES_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

interface CachedRates {
    timestamp: number;
    rates: Record<string, number>;
}

const REGION_TO_CURRENCY: Record<string, string> = {
    BR: 'BRL',
    RU: 'RUB',
    BY: 'BYN',
    KZ: 'KZT',
    UA: 'UAH',
    ES: 'EUR',
    PT: 'EUR',
    DE: 'EUR',
    FR: 'EUR',
    IT: 'EUR',
    NL: 'EUR',
    BE: 'EUR',
    AT: 'EUR',
    IE: 'EUR',
    FI: 'EUR',
    GR: 'EUR',
    GB: 'GBP',
    CA: 'CAD',
    AU: 'AUD',
    NZ: 'NZD',
    MX: 'MXN',
    AR: 'ARS',
    CL: 'CLP',
    CO: 'COP',
    PE: 'PEN',
    UY: 'UYU',
    CH: 'CHF',
    PL: 'PLN',
    SE: 'SEK',
    NO: 'NOK',
    DK: 'DKK',
    JP: 'JPY',
    KR: 'KRW',
    IN: 'INR',
    TR: 'TRY',
    ZA: 'ZAR',
};

const TIMEZONE_TO_CURRENCY: Record<string, string> = {
    'America/Sao_Paulo': 'BRL',
    'America/Fortaleza': 'BRL',
    'America/Recife': 'BRL',
    'America/Belem': 'BRL',
    'America/Manaus': 'BRL',
    'America/Cuiaba': 'BRL',
    'America/Campo_Grande': 'BRL',
    'America/Porto_Velho': 'BRL',
    'America/Boa_Vista': 'BRL',
    'America/Rio_Branco': 'BRL',
    'America/Maceio': 'BRL',
    'America/Bahia': 'BRL',
    'America/Araguaina': 'BRL',
    'America/Santarem': 'BRL',
    'Europe/Moscow': 'RUB',
    'Europe/Kaliningrad': 'RUB',
    'Europe/Samara': 'RUB',
    'Asia/Yekaterinburg': 'RUB',
    'Asia/Omsk': 'RUB',
    'Asia/Novosibirsk': 'RUB',
    'Asia/Krasnoyarsk': 'RUB',
    'Asia/Irkutsk': 'RUB',
    'Asia/Yakutsk': 'RUB',
    'Asia/Vladivostok': 'RUB',
    'Europe/Minsk': 'BYN',
    'Asia/Almaty': 'KZT',
    'Europe/Kyiv': 'UAH',
    'Europe/Madrid': 'EUR',
    'Europe/Lisbon': 'EUR',
    'Europe/Berlin': 'EUR',
    'Europe/Paris': 'EUR',
    'Europe/Rome': 'EUR',
    'Europe/Amsterdam': 'EUR',
    'Europe/Brussels': 'EUR',
    'Europe/Vienna': 'EUR',
    'Europe/Dublin': 'EUR',
    'Europe/Helsinki': 'EUR',
    'Europe/Athens': 'EUR',
    'Europe/London': 'GBP',
    'America/Toronto': 'CAD',
    'America/Vancouver': 'CAD',
    'Australia/Sydney': 'AUD',
    'Australia/Melbourne': 'AUD',
    'America/Mexico_City': 'MXN',
    'America/Argentina/Buenos_Aires': 'ARS',
    'America/Santiago': 'CLP',
    'America/Bogota': 'COP',
    'America/Lima': 'PEN',
    'America/Montevideo': 'UYU',
    'Europe/Zurich': 'CHF',
    'Europe/Warsaw': 'PLN',
    'Asia/Tokyo': 'JPY',
};

export function detectVisitorCurrency(): string {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz && TIMEZONE_TO_CURRENCY[tz]) {
            return TIMEZONE_TO_CURRENCY[tz];
        }
    } catch {
        // Ignore Intl timezone errors
    }

    const locales = [navigator.language, ...(navigator.languages || [])].filter(Boolean);
    for (const loc of locales) {
        const parts = loc.split('-');
        if (parts.length > 1) {
            const region = parts[parts.length - 1].toUpperCase();
            if (region === 'US') return 'USD';
            if (REGION_TO_CURRENCY[region]) {
                return REGION_TO_CURRENCY[region];
            }
        }
    }

    const primaryLang = (navigator.language || '').toLowerCase();
    if (primaryLang.startsWith('pt')) return 'BRL';
    if (primaryLang.startsWith('ru')) return 'RUB';

    return 'USD';
}

export async function getUsdExchangeRates(signal?: AbortSignal): Promise<Record<string, number> | null> {
    try {
        const raw = localStorage.getItem(RATES_CACHE_KEY);
        if (raw) {
            const parsed: CachedRates = JSON.parse(raw);
            if (Date.now() - parsed.timestamp < RATES_CACHE_TTL_MS && parsed.rates) {
                return parsed.rates;
            }
        }
    } catch {
        // Ignore storage errors
    }

    try {
        const response = await fetch('https://open.er-api.com/v6/latest/USD', { signal });
        if (!response.ok) return null;

        const data = await response.json();
        if (data?.result === 'success' && data?.rates) {
            try {
                const payload: CachedRates = {
                    timestamp: Date.now(),
                    rates: data.rates,
                };
                localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(payload));
            } catch {
                // Ignore storage quota errors
            }
            return data.rates as Record<string, number>;
        }
    } catch {
        // Ignore network/abort errors
    }

    return null;
}

export function formatConvertedPrice(amountUsd: number, currencyCode: string, rate: number): string {
    const converted = amountUsd * rate;
    try {
        const formatted = new Intl.NumberFormat(navigator.language || 'en-US', {
            style: 'currency',
            currency: currencyCode,
            maximumFractionDigits: converted >= 100 ? 0 : 2,
        }).format(converted);
        return `${formatted} (${currencyCode})`;
    } catch {
        return `${converted.toFixed(2)} ${currencyCode}`;
    }
}

export async function fetchLocalPricePreview(
    amountUsd: number,
    signal?: AbortSignal
): Promise<string | null> {
    const targetCurrency = detectVisitorCurrency();
    if (targetCurrency === 'USD') {
        return null;
    }

    const rates = await getUsdExchangeRates(signal);
    const rate = rates?.[targetCurrency];
    if (!rate) {
        return null;
    }

    return formatConvertedPrice(amountUsd, targetCurrency, rate);
}
