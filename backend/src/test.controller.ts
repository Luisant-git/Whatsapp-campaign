import { Controller, Get, Session } from '@nestjs/common';

@Controller('test')
export class TestController {
  @Get('session')
  testSession(@Session() session: any) {
    return {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasUserId: !!session?.userId,
      sessionData: {
        userId: session?.userId,
        user: session?.user,
      }
    };
  }
}
