export interface FlowEndpointRequest {
  encrypted_flow_data: string;
  encrypted_aes_key: string;
  initial_vector: string;
}

export interface FlowDataExchangeRequest {
  version: string;
  action: 'INIT' | 'data_exchange' | 'BACK' | 'ping';
  screen?: string;
  data?: Record<string, any>;
  flow_token?: string;
  flow_token_signature?: string;
}

export interface FlowErrorNotificationRequest {
  version: string;
  flow_token: string;
  action: 'data_exchange' | 'INIT';
  data: {
    error: string;
    error_message: string;
  };
}

export interface FlowHealthCheckRequest {
  version: string;
  action: 'ping';
}

export interface FlowNextScreenResponse {
  screen: string;
  data: Record<string, any>;
}

export interface FlowFinalResponse {
  screen: 'SUCCESS';
  data: {
    extension_message_response: {
      params: {
        flow_token: string;
        [key: string]: any;
      };
    };
  };
}

export interface FlowHealthCheckResponse {
  data: {
    status: 'active';
  };
}

export interface FlowErrorNotificationResponse {
  data: {
    acknowledged: boolean;
  };
}

export interface FlowAppointmentData {
  department?: string;
  location?: string;
  date?: string;
  time?: string;
  name?: string;
  email?: string;
  phone?: string;
  more_details?: string;
}