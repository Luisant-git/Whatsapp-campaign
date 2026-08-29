const fs = require('fs');
const path = require('path');

const webhookControllerContent = `import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { ComplaintService } from './complaint.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';

@ApiTags('Complaints Webhook')
@Controller('webhook')
export class WebhookController {
  constructor(private readonly complaintService: ComplaintService) {}

  @Post('whatsapp')
  @ApiOperation({ summary: 'Submit a new complaint from WhatsApp bot without auth' })
  @ApiBody({ type: CreateComplaintDto })
  createFromWhatsapp(@Body() body: CreateComplaintDto) {
    // Assuming 1 is the default admin/system user id
    return this.complaintService.create(body, 1);
  }
}
`;

const webhookPath = 'D:\\Public-Complaint--app\\backend\\src\\complaint\\webhook.controller.ts';
fs.writeFileSync(webhookPath, webhookControllerContent);
console.log('Created webhook.controller.ts');

const modulePath = 'D:\\Public-Complaint--app\\backend\\src\\complaint\\complaint.module.ts';
let moduleContent = fs.readFileSync(modulePath, 'utf8');

if (!moduleContent.includes('WebhookController')) {
  moduleContent = moduleContent.replace(
    "import { ComplaintController } from './complaint.controller';",
    "import { ComplaintController } from './complaint.controller';\nimport { WebhookController } from './webhook.controller';"
  );
  moduleContent = moduleContent.replace(
    "controllers: [ComplaintController],",
    "controllers: [ComplaintController, WebhookController],"
  );
  fs.writeFileSync(modulePath, moduleContent);
  console.log('Updated complaint.module.ts');
} else {
  console.log('complaint.module.ts already updated');
}
