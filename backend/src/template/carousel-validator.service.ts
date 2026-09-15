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

    cards.forEach((card, index) => {
      if (!card.components || !Array.isArray(card.components)) {
        throw new BadRequestException(`Card at index ${index} must contain components.`);
      }

      const header = card.components.find((c: any) => c.type === 'HEADER');
      if (!header || !header.format || !['IMAGE', 'VIDEO'].includes(header.format)) {
        throw new BadRequestException(`Card at index ${index} must have a valid media HEADER (IMAGE or VIDEO).`);
      }

      // Check if image is present
      if (!header.example || !header.example.header_handle) {
        throw new BadRequestException(`Card at index ${index} must have a media handle uploaded.`);
      }

      const body = card.components.find((c: any) => c.type === 'BODY');
      if (!body || !body.text) {
        throw new BadRequestException(`Card at index ${index} must have a BODY component with text.`);
      }

      const buttons = card.components.find((c: any) => c.type === 'BUTTONS');
      if (buttons && buttons.buttons && buttons.buttons.length > 2) {
        throw new BadRequestException(`Card at index ${index} cannot have more than 2 buttons.`);
      }
    });
  }
}
