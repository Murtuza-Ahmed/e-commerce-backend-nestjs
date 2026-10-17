import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpService } from './otp.service';
import { Otp } from './entities/otp.entity';
import { hmacHex } from '../common/crypto';

const SECRET = 'test-otp-secret';

function mockConfig() {
  return {
    get: jest.fn((key: string) => {
      if (key === 'OTP_TTL_MINUTES') return 10;
      if (key === 'OTP_MAX_ATTEMPTS') return 3;
      if (key === 'OTP_SECRET') return SECRET;
      return undefined;
    }),
  } as unknown as ConfigService;
}

function mockRepo() {
  return {
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    create: jest.fn((x: unknown) => x),
    save: jest.fn((x: unknown) => Promise.resolve(x)),
    findOne: jest.fn(),
  };
}

describe('OtpService', () => {
  it('issue(): purana pending OTP khatam karke naya code de', async () => {
    const repo = mockRepo();
    const svc = new OtpService(repo as never, mockConfig());
    const code = await svc.issue('User@X.com', 'email_verification');
    expect(code).toMatch(/^\d{6}$/);
    // identifier normalize (lowercase)
    expect(repo.delete).toHaveBeenCalledWith({
      identifier: 'user@x.com',
      purpose: 'email_verification',
      consumedAt: expect.anything(),
    });
    const saved = repo.save.mock.calls[0][0] as Otp;
    expect(saved.codeHash).not.toContain(code); // plain code store nahi
    expect(saved.codeHash).toBe(hmacHex(SECRET, code));
    expect(saved.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('verify(): sahi code consume ho jaye', async () => {
    const repo = mockRepo();
    const svc = new OtpService(repo as never, mockConfig());
    const otp = {
      identifier: 'a@b.c',
      purpose: 'email_verification',
      codeHash: hmacHex(SECRET, '123456'),
      attempts: 0,
      maxAttempts: 3,
      consumedAt: null,
    };
    repo.findOne.mockResolvedValue(otp);
    await svc.verify('a@b.c', 'email_verification', '123456');
    expect(otp.consumedAt).not.toBeNull();
  });

  it('verify(): ghalat code par attempts barhe aur dobara ghalat par block', async () => {
    const repo = mockRepo();
    const svc = new OtpService(repo as never, mockConfig());
    const otp = {
      identifier: 'a@b.c',
      purpose: 'email_verification',
      codeHash: hmacHex(SECRET, '123456'),
      attempts: 2,
      maxAttempts: 3,
      consumedAt: null,
    };
    repo.findOne.mockResolvedValue(otp);
    await expect(
      svc.verify('a@b.c', 'email_verification', '000000'),
    ).rejects.toThrow(BadRequestException);
    expect(otp.attempts).toBe(3);

    // ab limit full — agla verify foran block
    await expect(
      svc.verify('a@b.c', 'email_verification', '123456'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('verify(): expired/missing OTP par BadRequest', async () => {
    const repo = mockRepo();
    const svc = new OtpService(repo as never, mockConfig());
    repo.findOne.mockResolvedValue(null);
    await expect(
      svc.verify('a@b.c', 'email_verification', '123456'),
    ).rejects.toThrow(BadRequestException);
  });
});
