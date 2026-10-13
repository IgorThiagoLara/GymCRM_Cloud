export abstract class Entity {
  protected constructor(public readonly id: string, public readonly tenantId: string) {}
}
