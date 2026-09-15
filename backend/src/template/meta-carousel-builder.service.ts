import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateTemplateDto } from './dto/template.dto';

@Injectable()
export class MetaCarouselBuilderService {
  /**
   * Constructs the Meta API payload for Carousel templates.
   */
  async buildPayload(
    createTemplateDto: CreateTemplateDto,
    uploadMediaFn: (localPath: string) => Promise<string>
  ): Promise<any> {
    const validName = createTemplateDto.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const metaPayload: any = {
      name: validName,
      category: createTemplateDto.category.toUpperCase(),
      language: createTemplateDto.language,
      components: [],
    };

    const rootBody = createTemplateDto.components.find((c: any) => c.type === 'BODY');
    if (rootBody && rootBody.text && rootBody.text.trim()) {
      const processedRootBody = { ...rootBody };
      if (processedRootBody.text && processedRootBody.text.includes('{{')) {
        const variableCount = (processedRootBody.text.match(/{{\d+}}/g) || []).length;
        processedRootBody.example = {
          body_text: [[...Array(variableCount).fill(0).map((_, i) => {
            const sampleValue = createTemplateDto.sampleValues?.[i + 1];
            return sampleValue || `Sample ${i + 1}`;
          })]]
        };
      }
      metaPayload.components.push(processedRootBody);
    } else {
      // Meta requires a root BODY component even for carousel templates
      metaPayload.components.push({ type: 'BODY', text: ' ' });
    }

    const carouselComponent = createTemplateDto.components.find((c: any) => c.type === 'CAROUSEL');
    if (carouselComponent && carouselComponent.cards) {
      const processedCards = await Promise.all(
        carouselComponent.cards.map(async (card: any) => {
          const processedCardComponents = await Promise.all(
            card.components.map(async (comp: any) => {
              if (comp.type === 'HEADER' && ['IMAGE', 'VIDEO'].includes(comp.format)) {
                if (comp.example && comp.example.header_handle && comp.example.header_handle.length > 0) {
                  const mediaPath = comp.example.header_handle[0];
                  // If it's already a Meta asset handle or a full URL, upload it to get a Meta handle
                  let assetHandle = mediaPath;
                  if (!mediaPath.startsWith('h_')) {
                    // It's a local path or public URL — upload to Meta to get asset handle
                    assetHandle = await uploadMediaFn(mediaPath);
                  }
                  return {
                    type: 'HEADER',
                    format: comp.format,
                    example: {
                      header_handle: [assetHandle]
                    }
                  };
                }
              }

              if (comp.type === 'BODY' && comp.text && comp.text.includes('{{')) {
                // Card body variables are not supported by Meta yet, but if they were:
                const variableCount = (comp.text.match(/{{\d+}}/g) || []).length;
                return {
                  ...comp,
                  example: {
                    body_text: [[...Array(variableCount).fill(0).map((_, i) => `Sample ${i + 1}`)]]
                  }
                };
              }

              if (comp.type === 'BUTTONS' && comp.buttons) {
                const processedButtons = comp.buttons
                  .map((button: any) => {
                    if (button.type === 'URL') {
                      if (!button.text || !button.text.trim()) throw new BadRequestException('URL button must have text');
                      if (!button.url || !button.url.trim()) throw new BadRequestException('URL button must have a URL');
                      return { type: 'URL', text: button.text.trim(), url: button.url.trim() };
                    }
                    if (button.type === 'PHONE_NUMBER') {
                      if (!button.text || !button.text.trim()) throw new BadRequestException('Phone button must have text');
                      if (!button.phone_number) throw new BadRequestException('Phone number is required for PHONE_NUMBER button type');
                      const phoneNumber = button.phone_number.startsWith('+') ? button.phone_number : `+${button.phone_number}`;
                      return { type: 'PHONE_NUMBER', text: button.text.trim(), phone_number: phoneNumber };
                    }
                    // COPY_CODE not supported in carousel — skip
                    if (button.type === 'COPY_CODE') return null;
                    // QUICK_REPLY
                    if (!button.text || !button.text.trim()) throw new BadRequestException('Quick reply button must have text');
                    return { type: 'QUICK_REPLY', text: button.text.trim() };
                  })
                  .filter(Boolean);
                if (processedButtons.length === 0) return null; // drop empty BUTTONS component
                return { ...comp, buttons: processedButtons };
              }

              return comp;
            })
          );

          // Reorder card components: HEADER, BODY, BUTTONS
          const order = ['HEADER', 'BODY', 'BUTTONS'];
          const sortedCardComponents = processedCardComponents
            .filter(Boolean)
            .sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));

          return {
            components: sortedCardComponents
          };
        })
      );

      metaPayload.components.push({
        type: 'CAROUSEL',
        cards: processedCards
      });
    }

    return metaPayload;
  }
}
