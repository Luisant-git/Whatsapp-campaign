import { Controller, Post, Body, HttpCode, Res, Get } from '@nestjs/common';
import { CustomerDetailsFlowService } from '../whatsapp/flows/customer-details-flow.service';
import { Public } from '../auth/public.decorator';

@Controller('customer-details-flow')
export class CustomerDetailsFlowController {
  constructor(
    private readonly customerDetailsFlowService: CustomerDetailsFlowService
  ) {}

  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      message: 'Customer Details Flow API is working',
      endpoint: '/customer-details-flow/exchange',
      timestamp: new Date().toISOString()
    };
  }

  @Public()
  @Post('health')
  @HttpCode(200)
  postHealth(@Res() res: any) {
    const healthResponse = {
      data: {
        status: 'active'
      }
    };
    
    // Convert to Base64 as required by Meta
    const base64Response = Buffer.from(JSON.stringify(healthResponse)).toString('base64');
    
    res.setHeader('Content-Type', 'text/plain');
    return res.send(base64Response);
  }

  @Public()
  @Post('exchange')
  @HttpCode(200)
  async handleFlowExchange(@Body() body: any, @Res() res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');
    
    console.log('Customer Details Flow exchange received:', JSON.stringify(body, null, 2));
    
    const { screen, data, action, flow_token } = body;
    
    if (action === 'ping') {
      return res.status(200).json({
        screen: 'CUSTOMER_DETAILS',
        data: {}
      });
    }
    
    if (action === 'INIT') {
      try {
        const customerDetailsData = {
          customer_name: '',
          customer_address: '',
          customer_city: '',
          customer_pincode: '',
          payment_methods: [
            { id: 'razorpay', title: 'Pay Online' },
            { id: 'cod', title: 'Cash on Delivery' }
          ]
        };
        
        console.log('Providing customer details initial data:', customerDetailsData);
        
        return res.status(200).json({
          screen: 'CUSTOMER_DETAILS',
          data: customerDetailsData
        });
      } catch (error) {
        console.error('Error getting customer details initial data:', error);
        return res.status(200).json({
          screen: 'CUSTOMER_DETAILS',
          data: {
            customer_name: '',
            customer_address: '',
            customer_city: '',
            customer_pincode: '',
            payment_methods: [
              { id: 'cod', title: 'Cash on Delivery' }
            ]
          }
        });
      }
    }
    
    if (action === 'data_exchange' && screen === 'SUMMARY') {
      try {
        console.log('🔍 SUMMARY screen data exchange - Customer Details');
        console.log('🔍 Data field:', JSON.stringify(data, null, 2));
        console.log('🔍 Flow token:', flow_token);
        
        const customerData = await this.customerDetailsFlowService.saveCustomerDetailsFromFlow(data, flow_token);
        
        return res.status(200).json({
          screen: 'SUCCESS',
          data: {
            extension_message_response: {
              params: {
                flow_token: flow_token || 'completed',
                customer_data: JSON.stringify(customerData),
                message: 'Customer details collected successfully!'
              }
            }
          }
        });
      } catch (error) {
        console.error('Error saving customer details:', error);
        return res.status(200).json({
          screen: 'SUMMARY',
          data: {
            error_message: 'Sorry, we could not save your details. Please try again.'
          }
        });
      }
    }
    
    return res.status(200).json({ screen, data });
  }
}