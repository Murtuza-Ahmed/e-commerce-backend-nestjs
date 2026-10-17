import {
  comparePassword,
  generateOtpCode,
  hashPassword,
  hashTokenForStorage,
  maskEmail,
  verifyTokenHash,
} from './crypto';

describe('crypto helpers', () => {
  it('password hash/verify roundtrip', async () => {
    const hash = await hashPassword('Secret123');
    expect(hash).not.toBe('Secret123');
    expect(await comparePassword('Secret123', hash)).toBe(true);
    expect(await comparePassword('Wrong123', hash)).toBe(false);
  });

  it('refresh-token hash: same-prefix wale do tokens alag verify hon (72-byte fix)', async () => {
    // Do JWTs ek hi second me: pehle 72 bytes aksar same hote hain.
    const prefix = 'x'.repeat(72);
    const tokenA = prefix + 'AAAA';
    const tokenB = prefix + 'BBBB';
    const hashA = await hashTokenForStorage(tokenA);
    const hashB = await hashTokenForStorage(tokenB);
    expect(await verifyTokenHash(tokenA, hashA)).toBe(true);
    expect(await verifyTokenHash(tokenB, hashB)).toBe(true);
    // Cross verify NAHI hona chahiye — yehi asal bug tha.
    expect(await verifyTokenHash(tokenA, hashB)).toBe(false);
    expect(await verifyTokenHash(tokenB, hashA)).toBe(false);
  });

  it('OTP code 6-digit numeric ho', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateOtpCode()).toMatch(/^\d{6}$/);
    }
  });

  it('maskEmail', () => {
    expect(maskEmail('murtuza@gmail.com')).toBe('m***@gmail.com');
    expect(maskEmail('a@x.io')).toBe('a***@x.io');
  });
});
