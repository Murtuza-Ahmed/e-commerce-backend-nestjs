import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../rbac/entities/role.entity';

/**
 * User — role ab string enum nahi, Role table ka FK hai (dynamic RBAC).
 * - emailVerified: OTP verify kiye baghair login NAHI (requirement).
 * - phone: forgot-email flow ke liye (optional, unique).
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  phone!: string | null;

  @Column({ type: 'varchar', select: false })
  passwordHash!: string;

  @Column({ default: false })
  emailVerified!: boolean;

  @Column({ default: true })
  isActive!: boolean;

  @ManyToOne(() => Role, { nullable: false })
  @JoinColumn({ name: 'roleId' })
  role!: Role;

  @Column({ type: 'uuid' })
  roleId!: string;

  /** Refresh token ka hash (rotation). Null = logged out / kabhi login nahi. */
  @Column({ type: 'varchar', select: false, nullable: true })
  refreshTokenHash!: string | null;

  /** Profile picture — Cloudinary URL + publicId (purani delete karne ke liye). */
  @Column({ type: 'text', nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'varchar', nullable: true })
  avatarPublicId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
