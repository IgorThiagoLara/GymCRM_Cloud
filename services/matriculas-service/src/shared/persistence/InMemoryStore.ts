export class InMemoryStore<Row extends { id: string }> {
  readonly rows = new Map<string, Row>();
}
