/**
 * 将租户 ID 转换为 schema 名称
 * @param tenantId 租户 ID（可能已包含 tenant_ 前缀）
 * @returns schema 名称
 */
export const getSchemaName = (tenantId: string): string => {
  // 如果已经有 tenant_ 前缀，直接使用（只清理特殊字符）
  if (tenantId.startsWith('tenant_')) {
    return tenantId.replace(/[^a-zA-Z0-9_]/g, '_');
  }
  
  // 否则添加 tenant_ 前缀
  return `tenant_${tenantId.replace(/[^a-zA-Z0-9]/g, '_')}`;
};


