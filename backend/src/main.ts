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

  // Trust proxy (for production behind nginx)
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Enable CORS with dynamic origin support
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      // List of allowed origins
      const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:5174',
        'https://whatsapp.luisant.cloud',
        'https://whatsapp.admin.luisant.cloud',
        'https://crm.luisant.in',
      ];
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Allow any subdomain of luisant.in or luisant.cloud
      if (origin.match(/^https?:\/\/[\w-]+\.(luisant\.(in|cloud))$/)) {
        return callback(null, true);
      }
      
      // Reject other origins
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  // Cookie parser
  app.use(cookieParser());

  // Postgres session store
  const PgSession = connectPgSimple(session);
  app.use(
    session({
      store: new PgSession({
        conString: process.env.CENTRAL_DATABASE_URL,
        tableName: 'session',
        createTableIfMissing: true,
      }),
      name: 'user.sid', // ✅ Different from tenant/admin
      secret: process.env.SESSION_SECRET || 'keyboardcat',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      },
      proxy: true,
    }),
  );

  // Serve static uploads
  const uploadsPath =
    process.env.NODE_ENV === 'production'
      ? join(__dirname, '..', 'uploads')
      : join(process.cwd(), 'uploads');
  app.useStaticAssets(uploadsPath, { prefix: '/uploads/' });

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('WhatsApp Campaign API')
    .setDescription('API for WhatsApp Campaign Management')
    .setVersion('1.0')
    .addTag('Admin')
    .addTag('WhatsApp')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3010);
  console.log(`Server running on http://localhost:${process.env.PORT ?? 3010}`);
}
bootstrap();