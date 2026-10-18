import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

const sendMailMock = jest.fn().mockResolvedValue(undefined);

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: sendMailMock })),
}));

function makeService(devMode = true): MailService {
  const vals: Record<string, string | number | undefined> = devMode
    ? {}
    : {
        SMTP_HOST: 'smtp.test.com',
        SMTP_PORT: 587,
        SMTP_USER: 'u',
        SMTP_PASS: 'p',
        SMTP_FROM: 'Al-ucaaz <no-reply@al-ucaaz.com>',
      };
  const config = { get: (key: string) => vals[key] };
  return new MailService(config as unknown as ConfigService);
}

describe('MailService — premium English templates', () => {
  beforeEach(() => sendMailMock.mockClear());

  it('DEV MODE (bina SMTP) me email nahi jata, sirf log', async () => {
    const svc = makeService(true);
    expect(svc.isConfigured).toBe(false);
    await svc.sendOtpEmail('a@b.c', '123456', 'email_verification', 10);
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('har purpose ka English subject + HTML template jata hai', async () => {
    const svc = makeService(false);
    expect(svc.isConfigured).toBe(true);

    await svc.sendOtpEmail('a@b.c', '123456', 'email_verification', 10);
    const arg = sendMailMock.mock.calls[0][0];
    expect(arg.subject).toBe('Al-ucaaz — Verify your Al-ucaaz email address');
    expect(arg.html).toContain('123456');
    expect(arg.html).toContain('AL-UCAAZ');
    expect(arg.html).toContain('Verify your email');
    expect(arg.text).toContain('123456');
    // Roman Urdu nahi honi chahiye
    expect(arg.html).not.toMatch(/Apka verification code/i);
    expect(arg.text).not.toMatch(/Apka verification code/i);
  });

  it('password_reset ka apna English copy hota hai', async () => {
    const svc = makeService(false);
    await svc.sendOtpEmail('a@b.c', '999999', 'password_reset', 10);
    const arg = sendMailMock.mock.calls[0][0];
    expect(arg.subject).toBe('Al-ucaaz — Your Al-ucaaz password reset code');
    expect(arg.html).toContain('Reset your password');
    expect(arg.html).toContain("didn't request a password reset");
  });

  it('email change notice English me jata hai', async () => {
    const svc = makeService(false);
    await svc.sendEmailChangedNotice('old@x.com', 'new@x.com');
    const arg = sendMailMock.mock.calls[0][0];
    expect(arg.to).toBe('old@x.com');
    expect(arg.subject).toBe('Al-ucaaz — Your account email was changed');
    expect(arg.html).toContain('new@x.com');
    expect(arg.html).toContain('contact our support team immediately');
  });
});
