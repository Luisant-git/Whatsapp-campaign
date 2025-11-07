import { Injectable } from '@nestjs/common';

@Injectable()
export class WhatsappSessionService {
  async handleInteractiveMenu(
    from: string, 
    text: string, 
    sendCallback: (to: string, message: string, imageUrl?: string) => Promise<any>
  ) {
    // Basic interactive menu handling
    const lowerText = text.toLowerCase().trim();
    
    if (lowerText === 'menu' || lowerText === 'help') {
      const menuMessage = `
🤖 *WhatsApp Bot Menu*

Reply with:
• *info* - Get company information
• *support* - Contact support
• *menu* - Show this menu again

How can I help you today?`;
      
      return await sendCallback(from, menuMessage);
    }
    
    if (lowerText === 'info') {
      const infoMessage = `
ℹ️ *Company Information*

We are a leading WhatsApp campaign management platform.
Visit our website for more details.

Type *menu* to see all options.`;
      
      return await sendCallback(from, infoMessage);
    }
    
    if (lowerText === 'support') {
      const supportMessage = `
🆘 *Support Contact*

For technical support, please contact:
📧 Email: support@company.com
📞 Phone: +1-234-567-8900

Type *menu* to see all options.`;
      
      return await sendCallback(from, supportMessage);
    }
    
    // Default response for unrecognized messages
    const defaultMessage = `
Thank you for your message! 

Type *menu* to see available options or contact our support team for assistance.`;
    
    return await sendCallback(from, defaultMessage);
  }
}