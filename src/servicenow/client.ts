/**
 * ServiceNow REST API Client
 * Provides methods for interacting with ServiceNow Table API
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { generateBasicAuthHeader } from './auth.js';
import {
  ServiceNowTableResponse,
  ServiceNowSingleResponse,
  ServiceNowRecord,
  QueryParams
} from './types.js';

export class ServiceNowClient {
  private axiosInstance: AxiosInstance;
  private instance: string;

  constructor(instance: string, username: string, password: string) {
    this.instance = instance;

    // Create axios instance with ServiceNow configuration
    this.axiosInstance = axios.create({
      baseURL: `${instance}/api/now`,
      headers: {
        'Authorization': generateBasicAuthHeader(username, password),
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });
  }

  /**
   * Query a ServiceNow table
   * @param table Table name (e.g., 'incident', 'sys_user')
   * @param params Query parameters
   * @returns Array of records
   */
  async query<T = ServiceNowRecord>(
    table: string,
    params?: QueryParams
  ): Promise<ServiceNowTableResponse<T>> {
    try {
      const response = await this.axiosInstance.get<ServiceNowTableResponse<T>>(
        `/table/${table}`,
        { params }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'query');
    }
  }

  /**
   * Get a single record by sys_id
   * @param table Table name
   * @param sysId Record sys_id
   * @param params Query parameters
   * @returns Single record
   */
  async get<T = ServiceNowRecord>(
    table: string,
    sysId: string,
    params?: QueryParams
  ): Promise<ServiceNowSingleResponse<T>> {
    try {
      const response = await this.axiosInstance.get<ServiceNowSingleResponse<T>>(
        `/table/${table}/${sysId}`,
        { params }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'get');
    }
  }

  /**
   * Create a new record
   * @param table Table name
   * @param data Record data
   * @returns Created record
   */
  async create<T = ServiceNowRecord>(
    table: string,
    data: Partial<T>
  ): Promise<ServiceNowSingleResponse<T>> {
    try {
      const response = await this.axiosInstance.post<ServiceNowSingleResponse<T>>(
        `/table/${table}`,
        data
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'create');
    }
  }

  /**
   * Update an existing record
   * @param table Table name
   * @param sysId Record sys_id
   * @param data Fields to update
   * @returns Updated record
   */
  async update<T = ServiceNowRecord>(
    table: string,
    sysId: string,
    data: Partial<T>
  ): Promise<ServiceNowSingleResponse<T>> {
    try {
      const response = await this.axiosInstance.put<ServiceNowSingleResponse<T>>(
        `/table/${table}/${sysId}`,
        data
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'update');
    }
  }

  /**
   * Delete a record
   * @param table Table name
   * @param sysId Record sys_id
   */
  async delete(table: string, sysId: string): Promise<void> {
    try {
      await this.axiosInstance.delete(`/table/${table}/${sysId}`);
    } catch (error) {
      throw this.handleError(error, 'delete');
    }
  }

  /**
   * Get instance information
   */
  getInstanceInfo() {
    return {
      instance: this.instance,
      baseUrl: `${this.instance}/api/now`
    };
  }

  /**
   * Handle API errors and format them appropriately
   */
  private handleError(error: unknown, operation: string): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        const status = axiosError.response.status;
        const data = axiosError.response.data as any;

        // Format error message based on status code
        switch (status) {
          case 401:
            return new Error(
              'Authentication failed. Please check your SERVICENOW_USERNAME and SERVICENOW_PASSWORD environment variables.'
            );
          case 403:
            return new Error(
              `Forbidden: You don't have permission to ${operation} this resource. Check user permissions in ServiceNow.`
            );
          case 404:
            return new Error(
              `Not found: The requested resource does not exist. Check table name and sys_id.`
            );
          case 429:
            return new Error(
              'Rate limit exceeded. Please wait before making more requests.'
            );
          case 500:
          case 502:
          case 503:
            return new Error(
              `ServiceNow server error (${status}). The ServiceNow instance may be experiencing issues.`
            );
          default:
            const message = data?.error?.message || data?.error?.detail || axiosError.message;
            return new Error(
              `ServiceNow API error (${status}): ${message}`
            );
        }
      } else if (axiosError.request) {
        return new Error(
          `Network error: Could not connect to ServiceNow instance at ${this.instance}. ` +
          'Check the SERVICENOW_INSTANCE URL and your network connection.'
        );
      }
    }

    return error instanceof Error ? error : new Error(String(error));
  }
}

// Singleton client instance
let client: ServiceNowClient | null = null;

/**
 * Initialize the ServiceNow client
 */
export function initializeClient(instance: string, username: string, password: string): void {
  client = new ServiceNowClient(instance, username, password);
}

/**
 * Get the initialized ServiceNow client
 * @throws Error if client not initialized
 */
export function getClient(): ServiceNowClient {
  if (!client) {
    throw new Error('ServiceNow client not initialized. Call initializeClient first.');
  }
  return client;
}
