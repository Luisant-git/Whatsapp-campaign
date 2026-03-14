import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaClient as TenantPrismaClient } from '@prisma/client-tenant';

export type MinimalSettings = {
  phoneNumberId: string;
  accessToken: string;
  apiUrl: string;
  language?: string | null;
  headerImageUrl?: string | null; // can hold image or video URL
};

function isVideo(url = '') {
  return /\.(mp4|avi|mov|webm)$/i.test(url);
}

function buildComponents(bodyParams: string[], headerMediaUrl?: string) {
  const components: any[] = [];

  // Header media support
  if (headerMediaUrl) {
    if (isVideo(headerMediaUrl)) {
      components.push({
        type: 'header',
        parameters: [
          {
            type: 'video',
            video: {
              link: headerMediaUrl,
            },
          },
        ],
      });
    } else {
      components.push({
        type: 'header',
        parameters: [
          {
            type: 'image',
            image: {
              link: headerMediaUrl,
            },
          },
        ],
      });
    }
  }

  // Body params support
  if (bodyParams.length > 0) {
    components.push({
      type: 'body',
      parameters: bodyParams.map((t) => ({
        type: 'text',
        text: t ?? '',
      })),
    });
  }

  return components;
}

function parseExpectedParams(details?: string): number | null {
  if (!details) return null;
  const m = details.match(/expected number of params\s*\((\d+)\)/i);
  if (!m) return null;
  return Number(m[1]);
}

function normalizeParams(
  params: string[],
  expected: number,
  fallbackFirst?: string,
) {
  if (expected <= 0) return [];
  const out = [...params];

  if (out.length === 0 && fallbackFirst != null) out.push(fallbackFirst);

  while (out.length < expected) out.push('');
  if (out.length > expected) out.length = expected;

  return out;
}

@Injectable()
export class AutoTemplateSenderService {
  private readonly logger = new Logger(AutoTemplateSenderService.name);

  private async sendOnce(
    settings: MinimalSettings,
    to: string,
    templateName: string,
    bodyParams: string[],
  ) {
    const components = buildComponents(
      bodyParams,
      settings.headerImageUrl || undefined,
    );
  
    this.logger.log(
      `Sending template=${templateName}, to=${to}, headerImageUrl=${settings.headerImageUrl || 'EMPTY'}`
    );
    this.logger.log(`Components: ${JSON.stringify(components)}`);
  
    return axios.post(
      `${settings.apiUrl}/${settings.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: settings.language || 'en' },
          ...(components.length ? { components } : {}),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${settings.accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  async sendTemplate(
    tenantClient: TenantPrismaClient,
    settings: MinimalSettings,
    to: string,
    templateName: string,
    bodyParams: string[] = [],
    opts?: {
      fallbackFirstParam?: string;
      logMessage?: string;
    },
  ) {
    const logMessage = opts?.logMessage || `Template: ${templateName}`;

    try {
      const resp = await this.sendOnce(
        settings,
        to,
        templateName,
        bodyParams,
      );

      const messageId = resp.data?.messages?.[0]?.id || null;

      const safeId =
        messageId || `auto_${Date.now()}_${Math.random().toString(16).slice(2)}`;

      await tenantClient.whatsAppMessage.create({
        data: {
          messageId: safeId,
          to,
          from: to,
          message: logMessage,
          direction: 'outgoing',
          status: 'sent',
          phoneNumberId: settings.phoneNumberId,
        },
      });

      return messageId as string | null;
    } catch (error: any) {
      const code = error?.response?.data?.error?.code;
      const details = error?.response?.data?.error?.error_data?.details as
        | string
        | undefined;

      // Retry only for body param mismatch
      if (code === 132000) {
        const expected = parseExpectedParams(details);
        if (expected != null) {
          const fixed = normalizeParams(
            bodyParams,
            expected,
            opts?.fallbackFirstParam,
          );

          this.logger.warn(
            `Param mismatch for "${templateName}" to ${to}. Sent=${bodyParams.length} Expected=${expected}. Retrying...`,
          );

          const resp2 = await this.sendOnce(
            settings,
            to,
            templateName,
            fixed,
          );

          const messageId2 = resp2.data?.messages?.[0]?.id || null;

          const safeId2 =
            messageId2 ||
            `auto_${Date.now()}_${Math.random().toString(16).slice(2)}`;

          await tenantClient.whatsAppMessage.create({
            data: {
              messageId: safeId2,
              to,
              from: to,
              message: logMessage,
              direction: 'outgoing',
              status: 'sent',
              phoneNumberId: settings.phoneNumberId,
            },
          });

          return messageId2 as string | null;
        }
      }

      this.logger.error(
        `Auto template send failed to ${to} (${templateName})`,
        error.response?.data || error.message,
      );
      throw error;
    }
  }
}