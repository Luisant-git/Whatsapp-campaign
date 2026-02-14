import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Session } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SessionGuard } from '../auth/session.guard';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post()
  create(@Body() data: any) {
    return this.subscriptionService.create(data);
  }

  @Get()
  findAll() {
    return this.subscriptionService.findAll();
  }

  @Get('active')
  findActive() {
    return this.subscriptionService.findActive();
  }

  @Get('current')
  getCurrentPlan(@Session() session: any) {
    const userId = session.userId || session.user?.id;
    return this.subscriptionService.getCurrentPlan(userId);
  }

  @Get('my-orders')
  getUserOrders(@Session() session: any) {
    const userId = session.userId || session.user?.id;
    return this.subscriptionService.getUserOrders(userId);
  }

  @Get('users')
  getAllUserSubscriptions() {
    return this.subscriptionService.getAllUserSubscriptions();
  }

  @Get('orders/all')
  getAllOrders() {
    return this.subscriptionService.getAllOrders();
  }

  @Put('orders/:id/status')
  updateOrderStatus(@Param('id') id: string, @Body() data: { status: string }) {
    return this.subscriptionService.updateOrderStatus(+id, data.status);
  }

  @Put('set-current/:orderId')
  setCurrentPlan(@Session() session: any, @Param('orderId') orderId: string) {
    const userId = session.userId || session.user?.id;
    return this.subscriptionService.setCurrentPlan(userId, +orderId);
  }

  @Post('subscribe/:planId')
  subscribe(@Session() session: any, @Param('planId') planId: string) {
    const userId = session.userId || session.user?.id;
    return this.subscriptionService.subscribe(userId, +planId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subscriptionService.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.subscriptionService.update(+id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.subscriptionService.remove(+id);
  }
}
