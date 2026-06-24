export function mapConfiguratorTypeRow(row) {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        isActive: row.is_active,
        displayOrder: row.display_order
    };
}
