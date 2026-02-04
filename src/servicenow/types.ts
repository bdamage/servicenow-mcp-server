/**
 * TypeScript type definitions for ServiceNow REST API
 */

// Generic ServiceNow record with sys_id
export interface ServiceNowRecord {
  sys_id: string;
  [key: string]: any;
}

// ServiceNow Table API response structure
export interface ServiceNowTableResponse<T = ServiceNowRecord> {
  result: T[];
}

// ServiceNow single record response
export interface ServiceNowSingleResponse<T = ServiceNowRecord> {
  result: T;
}

// Query parameters for Table API
export interface QueryParams {
  sysparm_query?: string;          // Encoded query string
  sysparm_fields?: string;         // Comma-separated field list
  sysparm_limit?: number;          // Max records to return
  sysparm_offset?: number;         // Pagination offset
  sysparm_display_value?: string;  // Display value (true, false, all)
  sysparm_exclude_reference_link?: boolean;
  [key: string]: any;
}

// Common ServiceNow tables
export interface IncidentRecord extends ServiceNowRecord {
  number?: string;
  short_description?: string;
  description?: string;
  priority?: string;
  state?: string;
  assigned_to?: string;
  assignment_group?: string;
  caller_id?: string;
  category?: string;
  subcategory?: string;
  opened_at?: string;
  closed_at?: string;
}

export interface UserRecord extends ServiceNowRecord {
  user_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  title?: string;
  department?: string;
  active?: boolean;
}

export interface ChangeRequestRecord extends ServiceNowRecord {
  number?: string;
  short_description?: string;
  description?: string;
  priority?: string;
  state?: string;
  type?: string;
  risk?: string;
  impact?: string;
}

// ServiceNow error response
export interface ServiceNowError {
  error: {
    message: string;
    detail?: string;
  };
  status: string;
}
