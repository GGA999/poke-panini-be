export function mapConfiguratorTypeRow(row) {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        isActive: row.is_active,
        displayOrder: row.display_order
    };
}
