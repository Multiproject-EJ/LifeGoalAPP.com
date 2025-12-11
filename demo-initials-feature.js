#!/usr/bin/env node

/**
 * Initials Feature Demo
 * 
 * This script demonstrates the initials generation logic used in the LifeGoalApp
 */

// Copy of the generateInitials function from src/utils/initials.ts
function generateInitials(fullName) {
  if (!fullName) return '';
  
  const trimmed = fullName.trim();
  if (!trimmed) return '';
  
  const words = trimmed.split(/\s+/).filter(word => word.length > 0);
  
  if (words.length === 0) return '';
  
  const firstInitial = words[0].charAt(0).toUpperCase();
  
  let secondInitial = '';
  if (words.length > 1) {
    secondInitial = words[1].charAt(0).toUpperCase();
  } else if (words[0].length > 1) {
    secondInitial = words[0].charAt(1).toUpperCase();
  }
  
  return firstInitial + secondInitial;
}

// Test cases demonstrating the feature
console.log('=== INITIALS FEATURE DEMO ===\n');

const testCases = [
  { name: 'Eivind Josefsen', description: 'Two-word name (problem statement example)' },
  { name: 'John Doe', description: 'Common two-word name' },
  { name: 'Alice', description: 'Single word name' },
  { name: 'Bob Smith Johnson', description: 'Three-word name (uses first two)' },
  { name: 'María García', description: 'Name with accents' },
  { name: 'X Y', description: 'Single letter names' },
  { name: '  Jane   Doe  ', description: 'Name with extra whitespace' },
  { name: '', description: 'Empty string' },
  { name: '   ', description: 'Only whitespace' },
];

testCases.forEach(({ name, description }) => {
  const initials = generateInitials(name);
  const displayName = name === '' ? '(empty)' : name === '   ' ? '(whitespace)' : `"${name}"`;
  const displayInitials = initials === '' ? '(empty)' : initials;
  console.log(`${displayName.padEnd(30)} → ${displayInitials.padEnd(10)} // ${description}`);
});

console.log('\n=== FEATURE WORKFLOW ===\n');
console.log('1. User enters name: "Eivind Josefsen"');
console.log('2. Initials auto-generated: "EJ"');
console.log('3. Initials displayed in form (read-only field)');
console.log('4. User saves account → initials stored in database');
console.log('5. Initials shown in Profile section on Account panel');
console.log('6. User toggles "Show my initials in main menu"');
console.log('7. Main menu icon changes from 🌿 to "EJ"');
console.log('\n✅ Feature implementation complete!\n');
