import { z } from 'zod';

const ISO2_TO_ISO3: Record<string, string> = {
  AT: 'AUT',
  BE: 'BEL',
  BG: 'BGR',
  CH: 'CHE',
  CY: 'CYP',
  CZ: 'CZE',
  DE: 'DEU',
  DK: 'DNK',
  EE: 'EST',
  ES: 'ESP',
  FI: 'FIN',
  FR: 'FRA',
  GB: 'GBR',
  GR: 'GRC',
  HR: 'HRV',
  HU: 'HUN',
  IE: 'IRL',
  IS: 'ISL',
  IT: 'ITA',
  LT: 'LTU',
  LU: 'LUX',
  LV: 'LVA',
  MT: 'MLT',
  NL: 'NLD',
  NO: 'NOR',
  PL: 'POL',
  PT: 'PRT',
  RO: 'ROU',
  SE: 'SWE',
  SI: 'SVN',
  SK: 'SVK',
};

const ISO3_TO_ISO2: Record<string, string> = Object.fromEntries(
  Object.entries(ISO2_TO_ISO3).map(([iso2, iso3]) => [iso3, iso2]),
);

/**
 * Normalizes an ISO 3166-1 alpha-2 or alpha-3 country code to uppercase alpha-2.
 */
export function toIso2Country(code: string): string | null {
  const upper = code.trim().toUpperCase();
  if (upper in ISO2_TO_ISO3) {
    return upper;
  }
  return ISO3_TO_ISO2[upper] ?? null;
}

/**
 * Normalizes an ISO 3166-1 alpha-2 or alpha-3 country code to uppercase alpha-3.
 */
export function toIso3Country(code: string): string | null {
  const upper = code.trim().toUpperCase();
  if (upper in ISO3_TO_ISO2) {
    return upper;
  }
  return ISO2_TO_ISO3[upper] ?? null;
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [yStr, mStr, dStr] = value.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const CountryCodeSchema = z
  .string()
  .trim()
  .transform((val, ctx) => {
    const iso2 = toIso2Country(val);
    if (!iso2) {
      ctx.addIssue({
        code: 'custom',
        message: `Unsupported or invalid country code: "${val}"`,
      });
      return z.NEVER;
    }
    return iso2;
  });

const CpvCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{2,8}$/, 'CPV code must be 2 to 8 digits');

const IsoDateSchema = z
  .string()
  .trim()
  .refine(isValidIsoDate, 'Date must be a valid YYYY-MM-DD ISO date');

export const ActorInputSchema = z
  .object({
    countries: z.array(CountryCodeSchema).default([]),
    cpvCodes: z.array(CpvCodeSchema).default([]),
    minBudget: z.number().nonnegative().optional(),
    maxBudget: z.number().nonnegative().optional(),
    publishedFrom: IsoDateSchema.optional(),
    publishedTo: IsoDateSchema.optional(),
    minDeadline: IsoDateSchema.optional(),
    maxDeadline: IsoDateSchema.optional(),
    maxItems: z.number().int().min(1).max(1000).default(50),
  })
  .refine(
    (data) =>
      data.minBudget === undefined ||
      data.maxBudget === undefined ||
      data.minBudget <= data.maxBudget,
    {
      message: 'minBudget must be less than or equal to maxBudget',
      path: ['minBudget'],
    },
  )
  .refine(
    (data) =>
      data.publishedFrom === undefined ||
      data.publishedTo === undefined ||
      data.publishedFrom <= data.publishedTo,
    {
      message: 'publishedFrom must be less than or equal to publishedTo',
      path: ['publishedFrom'],
    },
  )
  .refine(
    (data) =>
      data.minDeadline === undefined ||
      data.maxDeadline === undefined ||
      data.minDeadline <= data.maxDeadline,
    {
      message: 'minDeadline must be less than or equal to maxDeadline',
      path: ['minDeadline'],
    },
  );

export type FilterCriteria = z.infer<typeof ActorInputSchema>;

/**
 * Validates and normalizes raw Actor/tool input into FilterCriteria.
 */
export function parseActorInput(raw: unknown): FilterCriteria {
  return ActorInputSchema.parse(raw ?? {});
}

export const NormalizedTenderSchema = z.object({
  tenderId: z.string().min(1),
  title: z.string().min(1),
  buyerName: z.string().min(1),
  country: z.string().min(2),
  cpvCodes: z.array(z.string()),
  estimatedValue: z.number().finite().nullable(),
  currency: z.string().min(1).nullable(),
  publicationDate: IsoDateSchema,
  submissionDeadline: IsoDateSchema.nullable(),
  documentUrl: z.string().url(),
});

export type NormalizedTender = z.infer<typeof NormalizedTenderSchema>;
