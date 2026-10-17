import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule, ObserveInstrument } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  const config = app.get(ConfigService);

  // Saari routes /api ke neeche: GET /api/ (health), /api/api-docs (swagger)
  app.setGlobalPrefix('api');

  // Security headers (CSP off taake Swagger UI na toote)
  app.use(helmet({ contentSecurityPolicy: false }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const corsOrigin = config.get<string>('CORS_ORIGIN') ?? '*';
  app.enableCors({
    origin:
      corsOrigin === '*' ? '*' : corsOrigin.split(',').map((o) => o.trim()),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Al-ucaaz API')
      .setDescription(
        'Phase 1 — Users: signup/signin, email OTP verification, ' +
        'JWT access+refresh, forgot/reset password, forgot email, ' +
        'dynamic RBAC (roles & permissions).',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Access token',
          in: 'header',
        },
        'JWT-auth',
      )
      .build(),
  );
  SwaggerModule.setup('api/api-docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);
  console.info(`Al-ucaaz API running on port ${port} (prefix /api)`);
}
void bootstrap();
