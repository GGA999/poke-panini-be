import type { Database } from '../database.types.js';

export type ConfiguratorTypeRow =
  Database['public']['Tables']['configurator_types']['Row'];

export interface ConfiguratorTypeRecord {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  displayOrder: number;
}

export function mapConfiguratorTypeRow(
  row: ConfiguratorTypeRow
): ConfiguratorTypeRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    isActive: row.is_active,
    displayOrder: row.display_order
  };
}
