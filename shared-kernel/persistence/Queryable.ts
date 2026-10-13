export interface Queryable {
  query(text: string, params?: any[]): Promise<{ rows: any[] }>;
}
