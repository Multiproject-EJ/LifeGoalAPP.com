import { resolveIsland001AssemblyInvitationState } from '../island001AssemblyInvitations';
import { assertEqual, type TestCase } from './testHarness';

export const island001AssemblyInvitationsTests: TestCase[] = [
  {
    name: 'Island 001 invitations need the Assembly and every building at Level 3',
    run: () => {
      assertEqual(resolveIsland001AssemblyInvitationState({ assemblyComplete: false, buildLevels: [3, 3, 3, 3], invitationsSent: false }), 'not_ready', 'Assembly first');
      assertEqual(resolveIsland001AssemblyInvitationState({ assemblyComplete: true, buildLevels: [3, 3, 2, 3], invitationsSent: false }), 'needs_buildings', 'every building Level 3');
      assertEqual(resolveIsland001AssemblyInvitationState({ assemblyComplete: true, buildLevels: [3, 3, 3, 3], invitationsSent: false }), 'ready_to_send', 'phone opens');
      assertEqual(resolveIsland001AssemblyInvitationState({ assemblyComplete: true, buildLevels: [3, 3, 3, 3], invitationsSent: true }), 'sent', 'sent once');
    },
  },
];
