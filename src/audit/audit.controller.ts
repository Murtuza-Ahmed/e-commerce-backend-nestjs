import {
  Controller,
  Get,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators';
import { AuditService } from './audit.service';

/**
 * Admin audit trail — sirf super_admin parh sakta hai (audit:read).
 * Append-only: koi update/delete endpoint nahi.
 */
@ApiTags('audit')
@ApiBearerAuth('JWT-auth')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequirePermissions('audit:read')
  list(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('action') action?: string,
    @Query('actor') actorEmail?: string,
    @Query('targetId', new ParseUUIDPipe({ optional: true }))
    targetId?: string,
  ) {
    return this.audit.list(Math.max(page, 1), Math.min(limit, 100), {
      action: action?.trim() || undefined,
      actorEmail: actorEmail?.trim() || undefined,
      targetId,
    });
  }
}
