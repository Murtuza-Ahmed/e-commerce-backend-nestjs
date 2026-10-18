import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Admin audit trail — staff ne users/roles par kya action liya.
 * Kabhi delete/update nahi hota (append-only); sirf super_admin parhta hai.
 */
@Entity('audit_logs')
@Index(['createdAt'])
@Index(['actorId'])
@Index(['action'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Action lene wala staff user (null = system). */
  @Column({ type: 'uuid', nullable: true })
  actorId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  actorEmail!: string | null;

  /** e.g. 'users.delete', 'users.set-role', 'roles.create' */
  @Column()
  action!: string;

  /** 'user' | 'role' */
  @Column()
  targetType!: string;

  @Column({ type: 'uuid', nullable: true })
  targetId!: string | null;

  /** e.g. { email, role } — chhoti useful detail. */
  @Column({ type: 'jsonb', nullable: true })
  details!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
