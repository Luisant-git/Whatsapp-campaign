import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ✅ TRUST PROXY
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // ✅ GLOBAL OPTIONS HANDLER (VERY IMPORTANT)
  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.header('Access-Control-Allow-Credentials', 'true');
      return res.sendStatus(200);
    }
    next();
  });

  // ✅ CORS (FINAL)
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // ✅ Cookie parser
  app.use(cookieParser());

  // ✅ Postgres session store
  const PgSession = connectPgSimple(session);
  app.use(
    session({
      store: new PgSession({
        conString: process.env.CENTRAL_DATABASE_URL,
        tableName: 'session',
        createTableIfMissing: true,
      }),
      name: 'user.sid',
      secret: process.env.SESSION_SECRET || 'keyboardcat',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      },
      proxy: true,
    }),
  );

  // ✅ Static uploads
  const uploadsPath =
    process.env.NODE_ENV === 'production'
      ? join(__dirname, '..', 'uploads')
      : join(process.cwd(), 'uploads');

  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads/',
  });

  // ✅ Swagger
  const config = new DocumentBuilder()
    .setTitle('WhatsApp Campaign API')
    .setDescription('API for WhatsApp Campaign Management')
    .setVersion('1.0')
    .addTag('Admin')
    .addTag('WhatsApp')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // ✅ Start server
  const port = process.env.PORT || 3010;
  await app.listen(port);

  console.log(`🚀 Server running on http://localhost:${port}`);
}

bootstrap();