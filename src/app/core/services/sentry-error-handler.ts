import { ErrorHandler, Injectable } from '@angular/core';
import * as Sentry from '@sentry/angular';

@Injectable()
export class SentryErrorHandler implements ErrorHandler {
  private readonly handler = Sentry.createErrorHandler({
    showDialog: false,
    logErrors: true,
  });

  handleError(error: any): void {
    this.handler.handleError(error);
  }
}
