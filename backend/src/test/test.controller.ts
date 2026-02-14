import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TestService } from './test.service';
import { SessionGuard } from '../auth/session.guard';
import { TenantContext } from '../tenant/tenant.decorator';
import type { TenantContext as TenantContextType } from '../tenant/tenant.decorator';
import { CreateTestDto } from './dto/test.dto';

@ApiTags('Test')
@Controller('test')
@UseGuards(SessionGuard)
export class TestController {
  constructor(private readonly testService: TestService) {}

  @Post()
  @ApiOperation({ summary: 'Create test item (demonstrates tenant isolation)' })
  @ApiResponse({ status: 201, description: 'Test item created successfully' })
  create(
    @Body() createTestDto: CreateTestDto,
    @TenantContext() tenantContext: TenantContextType,
  ) {
    return this.testService.create(createTestDto.name, tenantContext);
  }

  @Get()
  @ApiOperation({ summary: 'Get all test items (only from your tenant database)' })
  @ApiResponse({ status: 200, description: 'Test items retrieved successfully' })
  findAll(@TenantContext() tenantContext: TenantContextType) {
    return this.testService.findAll(tenantContext);
  }
}
