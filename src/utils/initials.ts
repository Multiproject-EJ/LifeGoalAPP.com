/**
 * Generate initials from a full name by taking the first letter of the first two words
 * @param fullName - The full name to generate initials from
 * @returns A two-letter initial string in uppercase, or empty string if name is invalid
 */
export function generateInitials(fullName: string | null | undefined): string {
  if (!fullName) return '';
  
  const trimmed = fullName.trim();
  if (!trimmed) return '';
  
  // Split by whitespace and filter out empty strings
  const words = trimmed.split(/\s+/).filter(word => word.length > 0);
  
  if (words.length === 0) return '';
  
  // Take first letter of first word
  const firstInitial = words[0].charAt(0).toUpperCase();
  
  // If there's a second word, take its first letter; otherwise use the second letter of the first word
  let secondInitial = '';
  if (words.length > 1) {
    secondInitial = words[1].charAt(0).toUpperCase();
  } else if (words[0].length > 1) {
    secondInitial = words[0].charAt(1).toUpperCase();
  }
  
  return firstInitial + secondInitial;
}
