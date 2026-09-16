import { CarouselValidatorService } from '../carousel-validator.service';
import { CreateTemplateDto, TemplateCategory } from '../dto/template.dto';
import { BadRequestException } from '@nestjs/common';

describe('CarouselValidatorService', () => {
  let service: CarouselValidatorService;

  beforeEach(() => {
    service = new CarouselValidatorService();
  });

  const getValidDto = (): CreateTemplateDto => ({
    name: 'test_carousel',
    category: TemplateCategory.MARKETING,
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Check out our deals',
      },
      {
        type: 'CAROUSEL',
        cards: [
          {
            components: [
              { type: 'HEADER', format: 'IMAGE', example: { header_handle: ['handle1'] } },
              { type: 'BODY', text: 'Item 1' },
              { type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'Buy' }] }
            ]
          },
          {
            components: [
              { type: 'HEADER', format: 'IMAGE', example: { header_handle: ['handle2'] } },
              { type: 'BODY', text: 'Item 2' },
              { type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'Buy' }] }
            ]
          }
        ]
      }
    ]
  });

  it('should validate a valid carousel', () => {
    expect(() => service.validate(getValidDto())).not.toThrow();
  });

  it('should throw if components array is missing', () => {
    const dto = getValidDto();
    delete (dto as any).components;
    expect(() => service.validate(dto)).toThrow(BadRequestException);
  });

  it('should throw if CAROUSEL component is missing', () => {
    const dto = getValidDto();
    dto.components = [{ type: 'BODY', text: 'No carousel here' }];
    expect(() => service.validate(dto)).toThrow(BadRequestException);
  });

  it('should throw if less than 2 cards are provided', () => {
    const dto = getValidDto();
    const carouselComp = dto.components.find(c => c.type === 'CAROUSEL');
    carouselComp.cards = [carouselComp.cards[0]]; // Only 1 card
    expect(() => service.validate(dto)).toThrow(BadRequestException);
  });

  it('should throw if more than 10 cards are provided', () => {
    const dto = getValidDto();
    const carouselComp = dto.components.find(c => c.type === 'CAROUSEL');
    const baseCard = carouselComp.cards[0];
    carouselComp.cards = Array(11).fill(baseCard);
    expect(() => service.validate(dto)).toThrow(BadRequestException);
  });

  it('should throw if a card is missing an image header', () => {
    const dto = getValidDto();
    const carouselComp = dto.components.find(c => c.type === 'CAROUSEL');
    // Remove header from first card
    carouselComp.cards[0].components = carouselComp.cards[0].components.filter((c: any) => c.type !== 'HEADER');
    expect(() => service.validate(dto)).toThrow(BadRequestException);
  });

  it('should throw if a card has more than 2 buttons', () => {
    const dto = getValidDto();
    const carouselComp = dto.components.find(c => c.type === 'CAROUSEL');
    const buttonsComp = carouselComp.cards[0].components.find((c: any) => c.type === 'BUTTONS');
    buttonsComp.buttons = [
      { type: 'QUICK_REPLY', text: '1' },
      { type: 'QUICK_REPLY', text: '2' },
      { type: 'QUICK_REPLY', text: '3' }
    ];
    expect(() => service.validate(dto)).toThrow(BadRequestException);
  });
});
