/**
 * Utility functions for expiration date color coding
 * 
 * Color coding based on expiration date:
 * - Red: Expired or less than danger_days remaining
 * - Orange/Yellow: Less than warning_days remaining
 * - Green: More than warning_days remaining
 */

/**
 * Parse YYYY-MM or YYYY/MM format to Date object
 * Returns the LAST day of the expiration month (end of validity)
 * Supports both formats: "2025-12" and "2025/12"
 */
export const parseExpireDate = (expireDateStr) => {
  if (!expireDateStr) return null;
  
  // تبدیل / به - برای یکسان‌سازی فرمت
  const normalizedDate = expireDateStr.replace(/\//g, '-');
  
  const parts = normalizedDate.split('-');
  if (parts.length !== 2) return null;
  
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  
  if (!year || !month || month < 1 || month > 12) return null;
  
  // Last day of the month: use day 0 of next month
  return new Date(year, month, 0, 23, 59, 59); // End of the expiration month
};

/**
 * Get days remaining until expiration
 */
export const getDaysUntilExpiration = (expireDateStr) => {
  const expireDate = parseExpireDate(expireDateStr);
  if (!expireDate) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset to start of today
  const diffTime = expireDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Get expiration status color
 * @param {string} expireDateStr - Expiration date in YYYY-MM format
 * @param {number} warningDays - Days threshold for warning (default: 90)
 * @returns {string} - MUI color: 'error', 'warning', 'success'
 */
export const getExpirationColor = (expireDateStr, warningDays = 90) => {
  const daysRemaining = getDaysUntilExpiration(expireDateStr);
  
  if (daysRemaining === null) return 'default';
  if (daysRemaining <= 0) return 'error';  // Expired (red)
  if (daysRemaining < warningDays) return 'warning';  // Expiring soon (yellow)
  return 'success';  // Safe (green)
};

/**
 * Get expiration background color for styling
 */
export const getExpirationBgColor = (expireDateStr, warningDays = 90) => {
  const color = getExpirationColor(expireDateStr, warningDays);
  
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
export const getExpirationTextColor = (expireDateStr, warningDays = 90) => {
  const color = getExpirationColor(expireDateStr, warningDays);
  
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
export const getExpirationSx = (expireDateStr, warningDays = 90) => {
  return {
    backgroundColor: getExpirationBgColor(expireDateStr, warningDays),
    color: getExpirationTextColor(expireDateStr, warningDays),
    fontWeight: 'bold',
    padding: '4px 8px',
    borderRadius: '4px'
  };
};
