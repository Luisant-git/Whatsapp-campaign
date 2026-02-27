import { ApiProperty } from '@nestjs/swagger';

export class ExpiringTenantDto {
  @ApiProperty() id: number;
  @ApiProperty() companyName: string;
  @ApiProperty() currentPlan: string;
  @ApiProperty() expiryDate: Date;
  @ApiProperty() status: string;
  @ApiProperty() daysLeft: number;
}

export class AdminTenantAnalyticsDto {
  @ApiProperty() totalTenants: number;
  @ApiProperty() activeTenants: number;
  @ApiProperty() expiredTenants: number;
  @ApiProperty() expiringSoonTenants: number;
  @ApiProperty({ type: [ExpiringTenantDto] }) expiringSoonList: ExpiringTenantDto[];
}