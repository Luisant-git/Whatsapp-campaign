import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Session, UnauthorizedException, ForbiddenException } from '@nestjs/common';
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
  @UseGuards(SessionGuard)
  getCurrentPlan(@Session() session: any) {
    const tenantId = Number(session.tenantId);
    if (!tenantId) throw new UnauthorizedException('Tenant context not found');
    return this.subscriptionService.getCurrentPlan(tenantId);
  }

  @Get('my-orders')
  @UseGuards(SessionGuard)
  getUserOrders(@Session() session: any) {
    const tenantId = Number(session.tenantId);
    if (!tenantId) throw new UnauthorizedException('Tenant context not found');
    return this.subscriptionService.getUserOrders(tenantId);
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
@UseGuards(SessionGuard)
setCurrentPlan(@Session() session: any, @Param('orderId') orderId: string) {
  if (session.userType === 'subuser') {
    throw new ForbiddenException('Sub-user cannot change subscription');
  }
  const tenantId = Number(session.tenantId);
  if (!tenantId) throw new UnauthorizedException('Tenant context not found');
  return this.subscriptionService.setCurrentPlan(tenantId, +orderId);
}
@Post('subscribe/:planId')
@UseGuards(SessionGuard)
subscribe(@Session() session: any, @Param('planId') planId: string) {
  if (session.userType === 'subuser') {
    throw new ForbiddenException('Sub-user cannot subscribe');
  }
  const tenantId = Number(session.tenantId);
  if (!tenantId) throw new UnauthorizedException('Tenant context not found');
  return this.subscriptionService.subscribe(tenantId, +planId);
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
