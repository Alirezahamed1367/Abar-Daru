/**
 * Utility functions for expiration date color coding
 * 
 * Color coding based on expiration date:
 * - Red: Expired or less than danger_days remaining
 * - Orange/Yellow: Less than warning_days remaining
 * - Green: More than warning_days remaining
 */

/**
 * Parse YYYY-MM format to Date object
 */
export const parseExpireDate = (expireDateStr) => {
  if (!expireDateStr) return null;
  const [year, month] = expireDateStr.split('-').map(Number);
  return new Date(year, month - 1, 1); // First day of the month
};

/**
 * Get days remaining until expiration
 */
export const getDaysUntilExpiration = (expireDateStr) => {
  const expireDate = parseExpireDate(expireDateStr);
  if (!expireDate) return null;
  
  const today = new Date();
  const diffTime = expireDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Get expiration status color
 * @param {string} expireDateStr - Expiration date in YYYY-MM format
 * @param {number} warningDays - Days threshold for warning (default: 90)
 * @param {number} dangerDays - Days threshold for danger (default: 30)
 * @returns {string} - MUI color: 'error', 'warning', 'success'
 */
export const getExpirationColor = (expireDateStr, warningDays = 90, dangerDays = 30) => {
  const daysRemaining = getDaysUntilExpiration(expireDateStr);
  
  if (daysRemaining === null) return 'default';
  if (daysRemaining <= 0 || daysRemaining < dangerDays) return 'error';
  if (daysRemaining < warningDays) return 'warning';
  return 'success';
};

/**
 * Get expiration background color for styling
 */
export const getExpirationBgColor = (expireDateStr, warningDays = 90, dangerDays = 30) => {
  const color = getExpirationColor(expireDateStr, warningDays, dangerDays);
  
  switch (color) {
    case 'error':
      return '#ffebee'; // Light red
    case 'warning':
      return '#fff3e0'; // Light orange
    case 'success':
      return '#e8f5e9'; // Light green
    default:
      return '#ffffff'; // White
  }
};

/**
 * Get expiration text color for styling
 */
export const getExpirationTextColor = (expireDateStr, warningDays = 90, dangerDays = 30) => {
  const color = getExpirationColor(expireDateStr, warningDays, dangerDays);
  
  switch (color) {
    case 'error':
      return '#d32f2f'; // Red
    case 'warning':
      return '#f57c00'; // Orange
    case 'success':
      return '#388e3c'; // Green
    default:
      return '#000000'; // Black
  }
};

/**
 * Get expiration status label
 */
export const getExpirationLabel = (expireDateStr) => {
  const daysRemaining = getDaysUntilExpiration(expireDateStr);
  
  if (daysRemaining === null) return 'نامشخص';
  if (daysRemaining <= 0) return 'منقضی شده';
  if (daysRemaining === 1) return '1 روز مانده';
  if (daysRemaining < 30) return `${daysRemaining} روز مانده`;
  
  const monthsRemaining = Math.floor(daysRemaining / 30);
  return `${monthsRemaining} ماه مانده`;
};

/**
 * Sort inventory items by expiration date (nearest first)
 */
export const sortByExpirationDate = (items) => {
  return [...items].sort((a, b) => {
    const dateA = parseExpireDate(a.expire_date);
    const dateB = parseExpireDate(b.expire_date);
    
    if (!dateA) return 1;
    if (!dateB) return -1;
    
    return dateA - dateB; // Ascending order (nearest first)
  });
};

/**
 * Get MUI sx props for expiration date styling
 */
export const getExpirationSx = (expireDateStr, warningDays = 90, dangerDays = 30) => {
  return {
    backgroundColor: getExpirationBgColor(expireDateStr, warningDays, dangerDays),
    color: getExpirationTextColor(expireDateStr, warningDays, dangerDays),
    fontWeight: 'bold',
    padding: '4px 8px',
    borderRadius: '4px'
  };
};
