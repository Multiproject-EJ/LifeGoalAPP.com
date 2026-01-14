// Simple verification script for ActionTimer functionality

const { calculateTimeRemaining } = require('./dist/types/actions.js');

console.log('Testing ActionTimer functionality...\n');

// Test 1: Future date (2 days from now)
const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
const result1 = calculateTimeRemaining(futureDate.toISOString());
console.log('Test 1 - Future date (2 days):');
console.log(`  Days: ${result1.daysRemaining}, Hours: ${result1.hoursRemaining}`);
console.log(`  Expired: ${result1.isExpired}, Expiring Soon: ${result1.isExpiringSoon}`);
console.log(`  ✓ ${!result1.isExpired && result1.daysRemaining >= 1 ? 'PASS' : 'FAIL'}\n`);

// Test 2: Expiring soon (12 hours)
const soonDate = new Date(Date.now() + 12 * 60 * 60 * 1000);
const result2 = calculateTimeRemaining(soonDate.toISOString());
console.log('Test 2 - Expiring soon (12 hours):');
console.log(`  Days: ${result2.daysRemaining}, Hours: ${result2.hoursRemaining}`);
console.log(`  Expired: ${result2.isExpired}, Expiring Soon: ${result2.isExpiringSoon}`);
console.log(`  ✓ ${result2.isExpiringSoon && !result2.isExpired ? 'PASS' : 'FAIL'}\n`);

// Test 3: Expired (past date)
const pastDate = new Date(Date.now() - 1000);
const result3 = calculateTimeRemaining(pastDate.toISOString());
console.log('Test 3 - Expired (past):');
console.log(`  Days: ${result3.daysRemaining}, Hours: ${result3.hoursRemaining}`);
console.log(`  Expired: ${result3.isExpired}, Expiring Soon: ${result3.isExpiringSoon}`);
console.log(`  ✓ ${result3.isExpired ? 'PASS' : 'FAIL'}\n`);

console.log('All tests completed!');
