import type { FilterCriteria, NormalizedTender } from '../domain/tender-schema.js';

export interface TenderSource {
  searchTenders(criteria: FilterCriteria): Promise<NormalizedTender[]>;
  getTenderById(tenderId: string): Promise<NormalizedTender | null>;
}
