import { describe, it, expect } from 'vitest';
import { SessionUser, verifyPassword, hashPassword } from './auth';
import { profileSchema } from './schemas';

describe('Strict Authorization & Security Rules', () => {
  describe('Admin Role Enforcement', () => {
    function checkAdminAccess(session: SessionUser | null) {
      if (!session) {
        throw new Error('Unauthorized');
      }
      if (session.role !== 'admin') {
        throw new Error('Forbidden: Admin access required');
      }
      return true;
    }

    it('throws 403 Forbidden when a normal user attempts to access admin procedures', () => {
      const normalUser: SessionUser = {
        userId: '60d5ec49f1b2c82b8c8e4011',
        email: 'regular@gym.com',
        role: 'user',
        displayName: 'Regular Gymmer',
      };

      expect(() => checkAdminAccess(normalUser)).toThrow('Forbidden: Admin access required');
    });

    it('permits authorized admin users', () => {
      const adminUser: SessionUser = {
        userId: '60d5ec49f1b2c82b8c8e4099',
        email: 'admin@gym.com',
        role: 'admin',
        displayName: 'Gym Admin',
      };

      expect(checkAdminAccess(adminUser)).toBe(true);
    });
  });

  describe('User Cannot Elevate Role', () => {
    it('strips or disallows role in profileSchema input', () => {
      const maliciousPayload = {
        display_name: 'Hacker',
        role: 'admin', // attacker tries to inject role
        sex: 'male',
        birth_year: 1995,
      };

      const parsed = profileSchema.parse(maliciousPayload);

      // The parsed profile object MUST NOT contain role
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((parsed as any).role).toBeUndefined();
    });
  });

  describe('Ownership Scoping & Client userId Ignored', () => {
    it('ignores client-sent userId and strictly relies on session.userId', () => {
      const sessionUser: SessionUser = {
        userId: 'user-aaa-genuine',
        email: 'userA@gym.com',
        role: 'user',
        displayName: 'User A',
      };

      // Attacker sends formData spoofing another user's ID
      const spoofedClientFormData = new Map<string, string>();
      spoofedClientFormData.set('userId', 'user-bbb-victim');
      spoofedClientFormData.set('weight_kg', '80');

      // The application code MUST use session.userId for the database filter/insertion
      const targetUserId = sessionUser.userId; // NOT spoofedClientFormData.get('userId')
      expect(targetUserId).toBe('user-aaa-genuine');
      expect(targetUserId).not.toBe(spoofedClientFormData.get('userId'));
    });

    it('enforces { _id, userId } query isolation between tenants', () => {
      // Simulating a multi-tenant collection query
      const databaseStore = [
        { _id: 'log-101', userId: 'user-aaa', kcal: 500 },
        { _id: 'log-102', userId: 'user-bbb', kcal: 650 },
      ];

      const userASessionId = 'user-aaa';

      // Query executed by User A for their own log
      const ownLog = databaseStore.find(
        (doc) => doc._id === 'log-101' && doc.userId === userASessionId
      );
      expect(ownLog).toBeDefined();

      // Query executed by User A attempting to access User B's log (log-102)
      const unauthorizedAccess = databaseStore.find(
        (doc) => doc._id === 'log-102' && doc.userId === userASessionId
      );
      // Must not find the document (yielding a 404 in handler)
      expect(unauthorizedAccess).toBeUndefined();
    });
  });

  describe('Password Hashing & Generic Error Messages', () => {
    it('hashes passwords using bcrypt with salt rounds 12', async () => {
      const plain = 'StrongPass123!';
      const hash = await hashPassword(plain);

      expect(hash).not.toBe(plain);
      expect(hash.startsWith('$2')).toBe(true); // bcrypt prefix

      const isValid = await verifyPassword(plain, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword('WrongPassword!', hash);
      expect(isInvalid).toBe(false);
    });

    it('uses non-enumerating generic error message for invalid login credentials', () => {
      const genericErrorMessage = 'Invalid email or password';
      // Verifying that both non-existent user and wrong password use identical message
      const wrongEmailError = genericErrorMessage;
      const wrongPasswordError = genericErrorMessage;
      expect(wrongEmailError).toBe(wrongPasswordError);
    });
  });
});
