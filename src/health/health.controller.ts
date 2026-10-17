import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators';

@ApiTags('health')
@Controller()
export class HealthController {
  @Public()
  @Get()
  health() {
    return {
      status: 'ok',
      service: 'al-ucaaz-api',
      phase: 'phase-1-users',
      time: new Date().toISOString(),
    };
  }
}
