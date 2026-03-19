import { Injectable } from '@nestjs/common';
import { FlowHandler } from './flow-handler.interface';

@Injectable()
export class CustomerDetailsFlowHandler implements FlowHandler {
  purpose = 'customer_details';

  async getInitialData(data?: any): Promise<any> {
    return {
      customer_name: data?.customerName || '',
      customer_address: data?.customerAddress || '',
      customer_city: data?.customerCity || '',
      customer_state: [
        { "id": "AN", "title": "Andaman and Nicobar Islands" },
        { "id": "AP", "title": "Andhra Pradesh" },
        { "id": "AR", "title": "Arunachal Pradesh" },
        { "id": "AS", "title": "Assam" },
        { "id": "BR", "title": "Bihar" },
        { "id": "CH", "title": "Chandigarh" },
        { "id": "CT", "title": "Chhattisgarh" },
        { "id": "DN", "title": "Dadra and Nagar Haveli and Daman and Diu" },
        { "id": "DL", "title": "Delhi" },
        { "id": "GA", "title": "Goa" },
        { "id": "GJ", "title": "Gujarat" },
        { "id": "HR", "title": "Haryana" },
        { "id": "HP", "title": "Himachal Pradesh" },
        { "id": "JK", "title": "Jammu and Kashmir" },
        { "id": "JH", "title": "Jharkhand" },
        { "id": "KA", "title": "Karnataka" },
        { "id": "KL", "title": "Kerala" },
        { "id": "LA", "title": "Ladakh" },
        { "id": "LD", "title": "Lakshadweep" },
        { "id": "MP", "title": "Madhya Pradesh" },
        { "id": "MH", "title": "Maharashtra" },
        { "id": "MN", "title": "Manipur" },
        { "id": "ML", "title": "Meghalaya" },
        { "id": "MZ", "title": "Mizoram" },
        { "id": "NL", "title": "Nagaland" },
        { "id": "OR", "title": "Odisha" },
        { "id": "PY", "title": "Puducherry" },
        { "id": "PB", "title": "Punjab" },
        { "id": "RJ", "title": "Rajasthan" },
        { "id": "SK", "title": "Sikkim" },
        { "id": "TN", "title": "Tamil Nadu" },
        { "id": "TG", "title": "Telangana" },
        { "id": "TR", "title": "Tripura" },
        { "id": "UP", "title": "Uttar Pradesh" },
        { "id": "UT", "title": "Uttarakhand" },
        { "id": "WB", "title": "West Bengal" }
      ],
      customer_pincode: data?.customerPincode || '',
      payment_methods: [
        { id: 'razorpay', title: 'Pay Online' },
        { id: 'cod', title: 'Cash on Delivery' }
      ]
    };
  }

  async handleDataExchange(screen: string, data: any, session: any): Promise<any> {
    switch (screen) {
      case 'CUSTOMER_DETAILS':
        return {
          screen: 'CUSTOMER_DETAILS',
          data: await this.getInitialData(session)
        };

      case 'SUMMARY':
        return this.processCustomerDetails(data, session);

      default:
        return { 
          screen: 'CUSTOMER_DETAILS',
          data: await this.getInitialData()
        };
    }
  }

  async processCustomerDetails(data: any, session: any): Promise<any> {
    try {
      console.log('📝 Processing customer details submission');
      console.log('📋 Data:', JSON.stringify(data, null, 2));
      console.log('🔑 Session:', JSON.stringify(session, null, 2));
      
      const customerData = {
        customerName: data.customer_name,
        customerAddress: data.customer_address,
        customerCity: data.customer_city,
        customerState: data.customer_state,
        customerPincode: data.customer_pincode,
        paymentMethod: data.payment_method
      };
      
      return {
        screen: 'SUCCESS',
        data: {
          extension_message_response: {
            params: {
              flow_token: session.flowToken || 'completed',
              customer_data: JSON.stringify(customerData),
              message: 'Customer details collected successfully!'
            }
          }
        }
      };
    } catch (error) {
      console.error('❌ Error in customer details submission:', error);
      return {
        screen: 'SUMMARY',
        data: {
          error_message: 'Failed to save customer details'
        }
      };
    }
  }

  async processSubmission(data: any, session: any): Promise<any> {
    return this.processCustomerDetails(data, session);
  }
}