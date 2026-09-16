import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateTemplateDto } from './dto/template.dto';

@Injectable()
export class CarouselValidatorService {
  /**
   * Validates the CRM Carousel DTO to ensure it meets Meta's constraints.
   */
  validate(createTemplateDto: CreateTemplateDto): void {
    if (!createTemplateDto.components || !Array.isArray(createTemplateDto.components)) {
      throw new BadRequestException('Components array is required.');
    }

    const carouselComponent = createTemplateDto.components.find(c => c.type === 'CAROUSEL');
    if (!carouselComponent) {
      throw new BadRequestException('CAROUSEL component is missing for a Carousel template.');
    }

    if (!carouselComponent.cards || !Array.isArray(carouselComponent.cards)) {
      throw new BadRequestException('Carousel must contain a valid cards array.');
    }

    const cards = carouselComponent.cards;
    if (cards.length < 2) {
      throw new BadRequestException('Carousel templates must have at least 2 cards.');
    }

    if (cards.length > 10) {
      throw new BadRequestException('Carousel templates cannot exceed 10 cards.');
    }

    const card1 = cards[0];
    const header1 = card1.components?.find((c: any) => c.type === 'HEADER');
    const hasBody1 = !!card1.components?.find((c: any) => c.type === 'BODY');
    const buttons1 = card1.components?.find((c: any) => c.type === 'BUTTONS')?.buttons || [];
    
    if (!header1 || !header1.format || !['IMAGE', 'VIDEO'].includes(header1.format)) {
      throw new BadRequestException(`Card 1 must have a valid media HEADER (IMAGE or VIDEO).`);
    }

    cards.forEach((card, index) => {
      if (!card.components || !Array.isArray(card.components)) {
        throw new BadRequestException(`Card at index ${index} must contain components.`);
      }

      const header = card.components.find((c: any) => c.type === 'HEADER');
      if (!header || header.format !== header1.format) {
        throw new BadRequestException(`Card at index ${index} must have a HEADER format of ${header1.format} to match Card 1.`);
      }

      if (!header.example || !header.example.header_handle) {
        throw new BadRequestException(`Card at index ${index} must have a media handle uploaded.`);
      }

      const body = card.components.find((c: any) => c.type === 'BODY');
      if (hasBody1 && (!body || !body.text)) {
        throw new BadRequestException(`Card at index ${index} must have a BODY component with text to match Card 1.`);
      }
      if (body?.text && body.text.length > 160) {
        throw new BadRequestException(`Card at index ${index} body text exceeds maximum limit of 160 characters.`);
      }

      const buttonsComp = card.components.find((c: any) => c.type === 'BUTTONS');
      const buttons = buttonsComp?.buttons || [];
      if (buttons.length > 2) {
        throw new BadRequestException(`Card at index ${index} cannot have more than 2 buttons.`);
      }

      if (buttons.length !== buttons1.length) {
        throw new BadRequestException(`Card at index ${index} must have exactly ${buttons1.length} buttons to match Card 1.`);
      }

      buttons.forEach((btn: any, btnIndex: number) => {
        if (btn.type !== buttons1[btnIndex].type) {
          throw new BadRequestException(`Card at index ${index} button ${btnIndex + 1} must be of type ${buttons1[btnIndex].type} to match Card 1.`);
        }
      });
    });
  }
}
