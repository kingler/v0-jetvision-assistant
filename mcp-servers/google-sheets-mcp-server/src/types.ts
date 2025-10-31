/**
 * Google Sheets MCP Server Types
 */

export interface SearchClientParams {
  clientName: string;
  exactMatch?: boolean;
}

export interface ReadSheetParams {
  range: string;
  sheetName?: string;
}

export interface WriteSheetParams {
  range: string;
  values: any[][];
  sheetName?: string;
}

export interface UpdateClientParams {
  clientName: string;
  data: Partial<ClientData>;
}

export interface CreateClientParams {
  data: ClientData;
}

export interface ClientData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  vipStatus?: 'standard' | 'vip' | 'ultra_vip';
  preferences?: {
    aircraftType?: string[];
    amenities?: string[];
    budgetRange?: {
      min: number;
      max: number;
    };
  };
  notes?: string;
  lastContact?: string;
}

export interface SheetRow {
  [key: string]: any;
}
