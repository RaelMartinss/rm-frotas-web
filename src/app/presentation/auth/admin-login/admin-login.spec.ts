import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminLoginComponent } from './admin-login';
import { IAuthRepository } from '../../../domain/repositories/auth.repository.interface';
import { of } from 'rxjs';

describe('AdminLoginComponent', () => {
  let component: AdminLoginComponent;
  let fixture: ComponentFixture<AdminLoginComponent>;

  beforeEach(async () => {
    const authRepoMock = {
      adminLogin: () =>
        of({
          accessToken: 'mock-token',
          user: { id: '1', name: 'Super Admin', email: 'admin@frotas.com', role: 'SUPER_ADMIN' },
        }),
      login: () => of({ accessToken: 'mock-token' }),
      logout: () => of(void 0),
    };

    await TestBed.configureTestingModule({
      imports: [AdminLoginComponent],
      providers: [provideRouter([]), { provide: IAuthRepository, useValue: authRepoMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLoginComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have invalid form initially', () => {
    expect(component.loginForm.valid).toBeFalsy();
  });

  it('should toggle showPassword signal', () => {
    expect(component.showPassword()).toBe(false);
    component.toggleShowPassword();
    expect(component.showPassword()).toBe(true);
  });
});
