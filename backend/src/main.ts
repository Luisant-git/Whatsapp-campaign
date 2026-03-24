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

  // ✅ Trust proxy (Nginx)
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // ✅ CORS (ONLY HERE — not in Nginx)
  app.enableCors({
    origin: (origin, callback) => {
      console.log('🔍 Incoming Origin:', origin);
      
      // Allow requests without origin (Postman, mobile apps, server-to-server)
      if (!origin) {
        console.log('✅ Allowed: No origin (server-to-server or Postman)');
        return callback(null, true);
      }

      const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:5174',
        'https://whatsapp.luisant.cloud',
        'https://whatsapp.admin.luisant.cloud',
        'https://crm.luisant.in',
        'https://business.facebook.com', 
        'https://www.facebook.com', 
      ];

      // Allow exact matches
      if (allowedOrigins.includes(origin)) {
        console.log('✅ Allowed: Exact match -', origin);
        return callback(null, true);
      }

      // Allow subdomains of luisant.in & luisant.cloud
      if (origin.match(/^https?:\/\/[\w-]+\.(luisant\.(in|cloud))$/)) {
        console.log('✅ Allowed: Subdomain match -', origin);
        return callback(null, true);
      }

      console.log('❌ Blocked by CORS:', origin);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization'],
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