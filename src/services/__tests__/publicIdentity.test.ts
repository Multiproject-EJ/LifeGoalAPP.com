/**
 * Public identity safety tests. Pure logic only — no Supabase.
 * Run via `npm run test:leaderboard`.
 */

import {
  cleanPublicIdentityLabel,
  containsBlockedPublicIdentityLanguage,
  validatePublicIdentityLabel,
} from '../publicIdentity';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message} (expected ${String(expected)}, received ${String(actual)})`);
  }
}

const tests: Array<{ name: string; run: () => void }> = [
  {
    name: 'ordinary public captain and ship names remain unchanged',
    run: () => {
      assertEqual(cleanPublicIdentityLabel('  Captain Nova  '), 'Captain Nova', 'Expected whitespace cleanup only');
      assertEqual(validatePublicIdentityLabel('The Lantern Wake', { label: 'Ship name' }), null, 'Expected safe ship name');
    },
  },
  {
    name: 'blocked words use the public fallback',
    run: () => {
      assertEqual(cleanPublicIdentityLabel('shit', 'Explorer'), 'Explorer', 'Expected blocked word fallback');
      assertEqual(
        validatePublicIdentityLabel('shit', { label: 'Captain name' }),
        'Choose a different captain name for public game spaces.',
        'Expected public-space validation message',
      );
    },
  },
  {
    name: 'separated and punctuation-obfuscated wording is detected',
    run: () => {
      assertEqual(containsBlockedPublicIdentityLanguage('f-u-c-k'), true, 'Expected separated letters to be detected');
      assertEqual(containsBlockedPublicIdentityLanguage('Captain f*uck'), true, 'Expected punctuation inserted inside a word');
      assertEqual(containsBlockedPublicIdentityLanguage('S H 1 T'), true, 'Expected spaced leetspeak to be detected');
    },
  },
  {
    name: 'leet and accented variants are detected without blocking ordinary names',
    run: () => {
      assertEqual(containsBlockedPublicIdentityLanguage('b1tch'), true, 'Expected leetspeak to be detected');
      assertEqual(containsBlockedPublicIdentityLanguage('fück'), true, 'Expected combining marks to be ignored');
      assertEqual(containsBlockedPublicIdentityLanguage('Captain Cass'), false, 'Expected ordinary name to remain allowed');
    },
  },
  {
    name: 'public labels are bounded before they reach winner tables',
    run: () => {
      assertEqual(cleanPublicIdentityLabel('123456789', 'Explorer', 5), '12345', 'Expected renderer-side maximum');
      assertEqual(
        validatePublicIdentityLabel('123456', { label: 'Captain name', maxLength: 5 }),
        'Captain name must be 5 characters or fewer.',
        'Expected authoring-side maximum',
      );
    },
  },
];

export function runAllPublicIdentityTests(): void {
  let passed = 0;
  for (const test of tests) {
    test.run();
    passed += 1;
  }
  console.log(`public-identity-tests: ${passed}/${tests.length} assertion-suites passed`);
}
