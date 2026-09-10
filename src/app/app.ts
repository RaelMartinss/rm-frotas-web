import { Component, HostListener, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './presentation/shared/toast/toast.component';
import { SessionLockModalComponent } from './presentation/shared/session-lock-modal/session-lock-modal.component';
import { InactivityGuardService } from './core/services/inactivity-guard.service';
import { AuthStateService } from './core/services/auth-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, SessionLockModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  title = 'rm-frotas-web';

  readonly inactivityGuard = inject(InactivityGuardService);
  private readonly authState = inject(AuthStateService);

  constructor() {
    effect(() => {
      const user = this.authState.currentUser();
      if (user && user.role) {
        this.inactivityGuard.start(user.role);
      } else {
        this.inactivityGuard.stop();
      }
    });
  }

  @HostListener('document:mousemove')
  @HostListener('document:keydown')
  @HostListener('document:click')
  @HostListener('document:touchstart')
  onActivity(): void {
    this.inactivityGuard.registerActivity();
  }
}
