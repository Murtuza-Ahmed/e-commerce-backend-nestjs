import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Permission } from './permission.entity';

/**
 * Role = permissions ka naam wala group.
 * - `grantsAll`: super_admin jaisa bypass (DB me stored, dynamic).
 * - `level`: hierarchy — bara level wala chhote level wale users ko
 *   manage kar sakta hai (super_admin 100 > admin 50 > customer 10).
 * - `isSystem`: seed wale roles delete nahi ho sakte.
 */
@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'int', default: 0 })
  level!: number;

  @Column({ default: false })
  grantsAll!: boolean;

  @Column({ default: false })
  isSystem!: boolean;

  @ManyToMany(() => Permission, { eager: false })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permissionId', referencedColumnName: 'id' },
  })
  permissions!: Permission[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
