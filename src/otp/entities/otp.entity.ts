import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type OtpPurpose =
  | 'email_verification'
  | 'password_reset'
  | 'email_recovery';

/**
 * OTP record. Code plain kabhi store nahi hota — sirf HMAC-SHA256 hash.
 * identifier = email (verification/reset) ya phone (email recovery).
 */
@Entity('otps')
@Index(['identifier', 'purpose'])
export class Otp {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  identifier!: string;

  @Column({ type: 'varchar' })
  purpose!: OtpPurpose;

  @Column({ type: 'varchar' })
  codeHash!: string;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ type: 'int' })
  maxAttempts!: number;

  @Column({ type: 'timestamptz', nullable: true })
  consumedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
