/**
 * Permission utility functions for access control
 */

/**
 * Check if user can edit/create/delete
 * Viewers cannot edit anything
 */
export const canEdit = (user) => {
  if (!user) return false;
  return user.access_level !== 'viewer';
};

/**
 * Check if user is admin or superadmin
 */
export const isAdmin = (user) => {
  if (!user) return false;
  return user.access_level === 'admin' || user.access_level === 'superadmin';
};

/**
 * Check if user is superadmin
 */
export const isSuperAdmin = (user) => {
  if (!user) return false;
  return user.access_level === 'superadmin';
};

/**
 * Check if user is viewer only
 */
export const isViewer = (user) => {
  if (!user) return false;
  return user.access_level === 'viewer';
};

/**
 * Check if user is warehouseman
 */
export const isWarehouseman = (user) => {
  if (!user) return false;
  return user.access_level === 'warehouseman';
};

/**
 * Check if warehouseman has access to specific warehouse
 * Admin/superadmin have access to all warehouses
 */
export const hasWarehouseAccess = (user, warehouseId) => {
  if (!user) return false;
  
  // Admin has access to all warehouses
  if (isAdmin(user)) return true;
  
  // Warehouseman: check their assigned warehouses
  if (isWarehouseman(user)) {
    return user.warehouses && user.warehouses.includes(warehouseId);
  }
  
  return false;
};

/**
 * Get accessible warehouses for user
 * Returns array of warehouse IDs or null for admin (all access)
 */
export const getAccessibleWarehouses = (user) => {
  if (!user) return [];
  
  // Admin has access to all
  if (isAdmin(user)) return null;
  
  // Return assigned warehouses
  return user.warehouses || [];
};

/**
 * Filter warehouses list based on user access
 * Returns all warehouses for admin, only assigned for warehouseman
 */
export const filterWarehousesByAccess = (warehouses, user) => {
  if (!user || !warehouses) return [];
  
  // Admin sees all
  if (isAdmin(user)) return warehouses;
  
  // Warehouseman sees only their warehouses
  if (isWarehouseman(user) && user.warehouses) {
    return warehouses.filter(w => user.warehouses.includes(w.id));
  }
  
  // Viewer sees all (can view but not edit)
  return warehouses;
};
