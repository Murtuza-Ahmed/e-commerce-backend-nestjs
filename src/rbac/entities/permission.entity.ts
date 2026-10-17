import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Ek atomic ijazat, masalan `users:create`. Dynamic RBAC. */
@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column()
  resource!: string;

  @Column()
  action!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;
}
