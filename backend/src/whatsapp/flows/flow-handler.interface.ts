export interface FlowHandler {
  purpose: string;
  
  // Get initial data for the flow
  getInitialData(data?: any): Promise<any>;
  
  // Handle data exchange for specific screens
  handleDataExchange(screen: string, data: any, session: any): Promise<any>;
  
  // Process final submission
  processSubmission(data: any, session: any): Promise<any>;
}

export interface FlowSession {
  id: number;
  flowToken: string;
  flowId: string;
  contactPhone: string;
  tenantId: string;
  purpose: string;
  currentScreen?: string;
  sessionData: any;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}