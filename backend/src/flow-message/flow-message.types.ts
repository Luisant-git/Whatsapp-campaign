export interface FlowResult {
  phoneNumber: string;
  status: 'success' | 'failed';
  messageId?: string;
  error?: string;
}

export interface SendFlowDto {
  phoneNumbers: string[];
  flowId: string;
  headerText?: string;
  bodyText?: string;
  footerText?: string;
  ctaText?: string;
  screenName?: string;
  screenData?: any;
}

export interface FlowResponse {
  totalSent: number;
  totalFailed: number;
  results: FlowResult[];
}