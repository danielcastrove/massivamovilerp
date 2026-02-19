// massivamovilerp/src/lib/validations/customer.test.ts
import { formatPhoneNumberForSupabase } from './customer';

describe('formatPhoneNumberForSupabase', () => {
  it('should prepend +58 and remove leading zero if present', () => {
    expect(formatPhoneNumberForSupabase('04121234567')).toBe('+584121234567');
  });

  it('should prepend +58 if no leading zero', () => {
    expect(formatPhoneNumberForSupabase('4121234567')).toBe('+584121234567');
  });

  it('should handle empty string input', () => {
    expect(formatPhoneNumberForSupabase('')).toBe('');
  });

  it('should handle undefined input', () => {
    expect(formatPhoneNumberForSupabase(undefined)).toBe(undefined);
  });

  it('should handle null input', () => {
    expect(formatPhoneNumberForSupabase(null as any)).toBe(null); // Type assertion for null
  });

  it('should remove non-digit characters', () => {
    expect(formatPhoneNumberForSupabase('(0412) 123-4567')).toBe('+584121234567');
  });

  it('should handle numbers shorter than 10 digits without error', () => {
    expect(formatPhoneNumberForSupabase('123')).toBe('+58123');
  });

  it('should handle numbers longer than 10 digits without error', () => {
    expect(formatPhoneNumberForSupabase('01234567890123')).toBe('+581234567890123');
  });
});
