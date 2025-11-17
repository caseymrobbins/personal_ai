/**
 * Database Service Mock
 *
 * Provides in-memory database for testing
 */

import { vi } from 'vitest';
import type { Database } from 'sql.js';

export class MockDatabase implements Partial<Database> {
  private data: Map<string, any[]> = new Map();

  run(sql: string, params?: any[]): void {
    // Simple mock implementation
    if (sql.includes('INSERT INTO')) {
      const tableName = this.extractTableName(sql);
      if (!this.data.has(tableName)) {
        this.data.set(tableName, []);
      }
      this.data.get(tableName)!.push(params || []);
    } else if (sql.includes('DELETE FROM')) {
      const tableName = this.extractTableName(sql);
      this.data.set(tableName, []);
    } else if (sql.includes('CREATE TABLE')) {
      const tableName = this.extractTableName(sql);
      this.data.set(tableName, []);
    }
  }

  prepare(sql: string): any {
    const tableName = this.extractTableName(sql);
    const tableData = this.data.get(tableName) || [];

    return {
      bind: vi.fn(),
      step: vi.fn(() => {
        return tableData.length > 0;
      }),
      getAsObject: vi.fn(() => {
        return tableData.length > 0 ? tableData[0] : {};
      }),
      free: vi.fn(),
    };
  }

  exec(sql: string): void {
    this.run(sql);
  }

  export(): Uint8Array {
    return new Uint8Array([1, 2, 3, 4]);
  }

  close(): void {
    this.data.clear();
  }

  private extractTableName(sql: string): string {
    const match = sql.match(/(?:FROM|INTO|TABLE)\s+(\w+)/i);
    return match ? match[1] : 'unknown';
  }

  // Helper to inspect mock data
  getMockData(tableName: string): any[] {
    return this.data.get(tableName) || [];
  }

  // Helper to clear mock data
  clearMockData(): void {
    this.data.clear();
  }
}

export const createMockDatabase = (): MockDatabase => {
  return new MockDatabase();
};
