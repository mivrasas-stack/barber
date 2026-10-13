export interface RealtimeMetricsSnapshot {
  activeConnections: number;
  totalConnectionsOpened: number;
  totalConnectionsClosed: number;
  totalAuthSuccess: number;
  totalAuthFailures: number;
  totalSubscriptions: number;
  totalUnsubscriptions: number;
  totalUnauthorizedSubscriptions: number;
  totalMessagesReceived: number;
  totalMessagesSent: number;
  totalSlowConsumerDisconnects: number;
  totalHeartbeatTimeouts: number;
  totalDegradedEvents: number;
}

export class RealtimeMetrics {
  private activeConnections = 0;
  private totalConnectionsOpened = 0;
  private totalConnectionsClosed = 0;
  private totalAuthSuccess = 0;
  private totalAuthFailures = 0;
  private totalSubscriptions = 0;
  private totalUnsubscriptions = 0;
  private totalUnauthorizedSubscriptions = 0;
  private totalMessagesReceived = 0;
  private totalMessagesSent = 0;
  private totalSlowConsumerDisconnects = 0;
  private totalHeartbeatTimeouts = 0;
  private totalDegradedEvents = 0;

  connectionOpened(): void {
    this.activeConnections++;
    this.totalConnectionsOpened++;
  }

  connectionClosed(): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
    this.totalConnectionsClosed++;
  }

  authSuccess(): void {
    this.totalAuthSuccess++;
  }

  authFailure(): void {
    this.totalAuthFailures++;
  }

  subscriptionAdded(): void {
    this.totalSubscriptions++;
  }

  subscriptionRemoved(): void {
    this.totalUnsubscriptions++;
  }

  subscriptionDenied(): void {
    this.totalUnauthorizedSubscriptions++;
  }

  messageReceived(): void {
    this.totalMessagesReceived++;
  }

  messageSent(): void {
    this.totalMessagesSent++;
  }

  slowConsumerDisconnected(): void {
    this.totalSlowConsumerDisconnects++;
  }

  heartbeatTimeout(): void {
    this.totalHeartbeatTimeouts++;
  }

  degradedEvent(): void {
    this.totalDegradedEvents++;
  }

  getSnapshot(): RealtimeMetricsSnapshot {
    return {
      activeConnections: this.activeConnections,
      totalConnectionsOpened: this.totalConnectionsOpened,
      totalConnectionsClosed: this.totalConnectionsClosed,
      totalAuthSuccess: this.totalAuthSuccess,
      totalAuthFailures: this.totalAuthFailures,
      totalSubscriptions: this.totalSubscriptions,
      totalUnsubscriptions: this.totalUnsubscriptions,
      totalUnauthorizedSubscriptions: this.totalUnauthorizedSubscriptions,
      totalMessagesReceived: this.totalMessagesReceived,
      totalMessagesSent: this.totalMessagesSent,
      totalSlowConsumerDisconnects: this.totalSlowConsumerDisconnects,
      totalHeartbeatTimeouts: this.totalHeartbeatTimeouts,
      totalDegradedEvents: this.totalDegradedEvents,
    };
  }
}
