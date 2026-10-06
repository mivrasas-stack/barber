export interface ServiceProps {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string | null;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  priceMinor: number;
  currency: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Service {
  constructor(private readonly props: ServiceProps) {}

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }

  get description(): string | null | undefined {
    return this.props.description;
  }

  get durationMinutes(): number {
    return this.props.durationMinutes;
  }

  get bufferBeforeMinutes(): number {
    return this.props.bufferBeforeMinutes;
  }

  get bufferAfterMinutes(): number {
    return this.props.bufferAfterMinutes;
  }

  get totalOccupiedMinutes(): number {
    return this.props.bufferBeforeMinutes + this.props.durationMinutes + this.props.bufferAfterMinutes;
  }

  get priceMinor(): number {
    return this.props.priceMinor;
  }

  get currency(): string {
    return this.props.currency;
  }

  get isActive(): boolean {
    return this.props.status === "ACTIVE";
  }
}
