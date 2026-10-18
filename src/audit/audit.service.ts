import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditEntry {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType: 'user' | 'role';
  targetId?: string | null;
  details?: Record<string, unknown> | null;
}

/**
 * Audit trail service.
 * - log(): kabhi throw nahi karta — audit likhna fail ho jaye to asal
 *   action (user create/delete waghera) nahi rukta, sirf error log hota hai.
 * - list(): super_admin ke liye paginated, filterable trail.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.repo.save(
        this.repo.create({
          actorId: entry.actorId ?? null,
          actorEmail: entry.actorEmail ?? null,
          action: entry.action,
          targetType: entry.targetType,
          targetId: entry.targetId ?? null,
          details: entry.details ?? null,
        }),
      );
    } catch (error) {
      this.logger.error(
        `Audit log failed (${entry.action}): ${(error as Error).message}`,
      );
    }
  }

  async list(
    page: number,
    limit: number,
    filters: { action?: string; actorEmail?: string; targetId?: string },
  ): Promise<{ data: AuditLog[]; total: number; page: number; limit: number }> {
    const qb = this.repo
      .createQueryBuilder('a')
      .orderBy('a.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (filters.action)
      qb.andWhere('a.action = :action', { action: filters.action });
    if (filters.actorEmail) {
      qb.andWhere('a.actorEmail ILIKE :actor', {
        actor: `%${filters.actorEmail}%`,
      });
    }
    if (filters.targetId)
      qb.andWhere('a.targetId = :targetId', { targetId: filters.targetId });
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }
}
