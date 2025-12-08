// Test expiration date calculation

const parseExpireDate = (expireDateStr) => {
  if (!expireDateStr) return null;
  const [year, month] = expireDateStr.split('-').map(Number);
  if (!year || !month) return null;
  // Last day of the month: use day 0 of next month
  return new Date(year, month, 0, 23, 59, 59); // End of the expiration month
};

const getDaysUntilExpiration = (expireDateStr) => {
  const expireDate = parseExpireDate(expireDateStr);
  if (!expireDate) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset to start of today
  const diffTime = expireDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Test cases
const testCases = [
  '2021-03',  // منقضی شده - مارس 2021
  '2024-12',  // منقضی شده - دسامبر 2024
  '2025-01',  // نزدیک انقضا - ژانویه 2025
  '2025-02',  // نزدیک انقضا - فوریه 2025
  '2025-03',  // نزدیک انقضا - مارس 2025
  '2025-12',  // سالم - دسامبر 2025
  '2026-06',  // سالم - ژوئن 2026
  '2027-05',  // سالم - می 2027
  '2028-05',  // سالم - می 2028
  '2030-11',  // سالم - نوامبر 2030
];

console.log('تاریخ امروز:', new Date().toLocaleDateString('fa-IR'));
console.log('\nنتایج تست:\n');

testCases.forEach(date => {
  const days = getDaysUntilExpiration(date);
  const expDate = parseExpireDate(date);
  let status = '';
  
  if (days < 0) {
    status = '🔴 منقضی شده';
  } else if (days < 30) {
    status = '🟠 بحرانی (کمتر از 30 روز)';
  } else if (days < 90) {
    status = '🟡 هشدار (کمتر از 90 روز)';
  } else {
    status = '🟢 سالم';
  }
  
  console.log(`تاریخ انقضا: ${date} → آخرین روز: ${expDate.toLocaleDateString('fa-IR')} → ${days} روز مانده → ${status}`);
});
