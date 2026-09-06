import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login';
import { IAuthRepository } from '../../../domain/repositories/auth.repository.interface';
import { of } from 'rxjs';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    const authRepoMock = {
      login: () => of({ accessToken: 'mock-token', user: { id: '1', name: 'Test', email: 'test@example.com', role: 'FLEET_MANAGER' } }),
      logout: () => of(void 0),
      getProfile: () => of(null)
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: IAuthRepository, useValue: authRepoMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

