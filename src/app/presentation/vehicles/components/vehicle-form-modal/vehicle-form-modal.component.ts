import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { IVehicleRepository } from '../../../../domain/repositories/vehicle.repository.interface';
import { ToastService } from '../../../../core/services/toast.service';
import { Vehicle } from '../../../../domain/models/vehicle.model';
import { PlateMaskDirective } from '../../../shared/directives/input-mask.directives';
import { ModalShellComponent } from '../../../shared/components/modal-shell/modal-shell.component';
import {
  POPULAR_VEHICLE_BRANDS,
  getVehicleBrandLogo
} from '../../../../core/utils/vehicle-brand.util';
import {
  LucideTruck,
  LucideLoader2,
  LucideAlertCircle
} from '@lucide/angular';

@Component({
  selector: 'app-vehicle-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PlateMaskDirective,
    ModalShellComponent,
    LucideTruck,
    LucideLoader2,
    LucideAlertCircle
  ],
  template: `
    <app-modal-shell
      [isOpen]="isOpen()"
      title="Cadastrar Novo Veículo"
      subtitle="Preencha os dados do veículo e documentação para alocação."
      maxWidth="lg"
      (close)="onClose()"
    >
      <div header-icon class="size-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60 p-1">
        @if (currentBrandLogo(); as logo) {
          <img [src]="logo" alt="Logo da Marca" class="size-full object-contain" />
        } @else {
          <svg lucideTruck class="size-4"></svg>
        }
      </div>

      <form [formGroup]="vehicleForm" (ngSubmit)="saveVehicle()" class="p-6 space-y-4">
        @if (errorMessage()) {
          <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-800 text-xs">
            <svg lucideAlertCircle class="size-4 text-rose-600 shrink-0 mt-0.5"></svg>
            <div class="flex-1">
              <span class="font-semibold">Erro no cadastro:</span> {{ errorMessage() }}
            </div>
          </div>
        }

        <div class="grid grid-cols-2 gap-4">
          <!-- Placa -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              Placa do Veículo <span class="text-rose-500">*</span>
            </label>
            <div class="relative">
              <input
                type="text"
                appPlateMask
                formControlName="plate"
                placeholder="Ex: ABC1D23"
                class="w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs font-mono font-bold tracking-wider text-slate-800 uppercase focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400"
                [class.border-rose-400]="vehicleForm.get('plate')?.invalid && vehicleForm.get('plate')?.touched"
                [class.bg-rose-50/50]="vehicleForm.get('plate')?.invalid && vehicleForm.get('plate')?.touched"
                [class.border-slate-200]="!(vehicleForm.get('plate')?.invalid && vehicleForm.get('plate')?.touched)"
              />
            </div>
            @if (vehicleForm.get('plate')?.touched && vehicleForm.get('plate')?.errors?.['required']) {
              <p class="text-[10px] text-rose-500 mt-1 font-medium">Campo obrigatório.</p>
            } @else if (vehicleForm.get('plate')?.touched && vehicleForm.get('plate')?.errors?.['pattern']) {
              <p class="text-[10px] text-rose-500 mt-1 font-medium">Formato inválido. Use ABC1234 ou ABC1D23.</p>
            }
          </div>

          <!-- Código RENAVAM (Opcional) -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Código RENAVAM</span>
              <span class="text-[10px] font-normal text-slate-400">Opcional</span>
            </label>
            <input
              type="text"
              formControlName="renavam"
              maxlength="11"
              placeholder="Ex: 00123456789"
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:font-sans placeholder:text-slate-400"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <!-- Marca -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Marca / Fabricante <span class="text-rose-500">*</span></span>
              @if (currentBrandLogo()) {
                <span class="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                  <span class="size-1.5 rounded-full bg-emerald-500"></span> Logo identificado
                </span>
              }
            </label>
            <div class="relative">
              <input
                type="text"
                list="popular-brands-list"
                formControlName="brand"
                placeholder="Ex: Chevrolet, Scania, Fiat"
                class="w-full bg-slate-50 border rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                [class.border-rose-400]="vehicleForm.get('brand')?.invalid && vehicleForm.get('brand')?.touched"
                [class.bg-rose-50/50]="vehicleForm.get('brand')?.invalid && vehicleForm.get('brand')?.touched"
                [class.border-slate-200]="!(vehicleForm.get('brand')?.invalid && vehicleForm.get('brand')?.touched)"
              />
              <div class="absolute left-2.5 top-1/2 -translate-y-1/2 size-4.5 flex items-center justify-center pointer-events-none">
                @if (currentBrandLogo(); as logo) {
                  <img [src]="logo" alt="Logo" class="size-full object-contain" />
                } @else {
                  <svg lucideTruck class="size-3.5 text-slate-400"></svg>
                }
              </div>
            </div>
            <datalist id="popular-brands-list">
              @for (brand of popularBrands; track brand.slug) {
                <option [value]="brand.name">{{ brand.name }}</option>
              }
            </datalist>
            @if (vehicleForm.get('brand')?.touched && vehicleForm.get('brand')?.errors?.['required']) {
              <p class="text-[10px] text-rose-500 mt-1 font-medium">Campo obrigatório.</p>
            }
          </div>

          <!-- Modelo -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              Modelo Comercial <span class="text-rose-500">*</span>
            </label>
            <input
              type="text"
              formControlName="model"
              placeholder="Ex: R 450, FH 540, Cargo"
              class="w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:text-slate-400"
              [class.border-rose-400]="vehicleForm.get('model')?.invalid && vehicleForm.get('model')?.touched"
              [class.bg-rose-50/50]="vehicleForm.get('model')?.invalid && vehicleForm.get('model')?.touched"
              [class.border-slate-200]="!(vehicleForm.get('model')?.invalid && vehicleForm.get('model')?.touched)"
            />
            @if (vehicleForm.get('model')?.touched && vehicleForm.get('model')?.errors?.['required']) {
              <p class="text-[10px] text-rose-500 mt-1 font-medium">Campo obrigatório.</p>
            }
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <!-- Ano -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              Ano de Fabricação <span class="text-rose-500">*</span>
            </label>
            <input
              type="number"
              formControlName="year"
              placeholder="2024"
              class="w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:text-slate-400"
              [class.border-rose-400]="vehicleForm.get('year')?.invalid && vehicleForm.get('year')?.touched"
              [class.bg-rose-50/50]="vehicleForm.get('year')?.invalid && vehicleForm.get('year')?.touched"
              [class.border-slate-200]="!(vehicleForm.get('year')?.invalid && vehicleForm.get('year')?.touched)"
            />
            @if (vehicleForm.get('year')?.touched && vehicleForm.get('year')?.errors?.['required']) {
              <p class="text-[10px] text-rose-500 mt-1 font-medium">Campo obrigatório.</p>
            } @else if (vehicleForm.get('year')?.touched && vehicleForm.get('year')?.errors?.['min']) {
              <p class="text-[10px] text-rose-500 mt-1 font-medium">Ano deve ser maior que 1900.</p>
            }
          </div>

          <!-- Quilometragem Inicial -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              KM Inicial do Odômetro <span class="text-rose-500">*</span>
            </label>
            <input
              type="number"
              formControlName="currentKm"
              placeholder="0"
              class="w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:font-sans placeholder:text-slate-400"
              [class.border-rose-400]="vehicleForm.get('currentKm')?.invalid && vehicleForm.get('currentKm')?.touched"
              [class.bg-rose-50/50]="vehicleForm.get('currentKm')?.invalid && vehicleForm.get('currentKm')?.touched"
              [class.border-slate-200]="!(vehicleForm.get('currentKm')?.invalid && vehicleForm.get('currentKm')?.touched)"
            />
            @if (vehicleForm.get('currentKm')?.touched && vehicleForm.get('currentKm')?.errors?.['required']) {
              <p class="text-[10px] text-rose-500 mt-1 font-medium">Campo obrigatório.</p>
            } @else if (vehicleForm.get('currentKm')?.touched && vehicleForm.get('currentKm')?.errors?.['min']) {
              <p class="text-[10px] text-rose-500 mt-1 font-medium">KM não pode ser negativo.</p>
            }
          </div>
        </div>

        <!-- Vencimento CRLV -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">
            Vencimento do CRLV
          </label>
          <input
            type="date"
            formControlName="crlvExpiration"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
          />
        </div>

        <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            (click)="onClose()"
            class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            [disabled]="isSaving()"
            class="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            @if (isSaving()) {
              <svg lucideLoader2 class="size-4 animate-spin"></svg>
            }
            Salvar Veículo
          </button>
        </div>
      </form>
    </app-modal-shell>
  `
})
export class VehicleFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly vehicleRepository = inject(IVehicleRepository);
  private readonly toastService = inject(ToastService);

  isOpen = input<boolean>(false);

  close = output<void>();
  vehicleCreated = output<Vehicle>();

  isSaving = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  vehicleForm: FormGroup = this.fb.group({
    plate: ['', [
      Validators.required,
      Validators.pattern(/^[A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}$/i)
    ]],
    brand: ['', [Validators.required]],
    model: ['', [Validators.required]],
    year: [new Date().getFullYear(), [Validators.required, Validators.min(1900)]],
    currentKm: [0, [Validators.required, Validators.min(0)]],
    crlvExpiration: [''],
    renavam: ['']
  });

  readonly popularBrands = POPULAR_VEHICLE_BRANDS;
  private readonly brandValue = toSignal(this.vehicleForm.get('brand')!.valueChanges, {
    initialValue: ''
  });
  readonly currentBrandLogo = computed(() => getVehicleBrandLogo(this.brandValue()));

  resetForm(): void {
    this.errorMessage.set(null);
    this.vehicleForm.reset({
      year: new Date().getFullYear(),
      currentKm: 0,
      crlvExpiration: '',
      renavam: ''
    });
  }

  onClose(): void {
    this.close.emit();
    this.errorMessage.set(null);
  }

  saveVehicle(): void {
    this.errorMessage.set(null);

    if (this.vehicleForm.invalid) {
      this.vehicleForm.markAllAsTouched();
      this.toastService.error('Por favor, preencha todos os campos obrigatórios corretamente.');
      return;
    }

    this.isSaving.set(true);
    const formValue = this.vehicleForm.value;
    const payload = {
      ...formValue,
      renavam: formValue.renavam?.trim() || undefined,
    };

    this.vehicleRepository.create(payload).subscribe({
      next: (newVehicle) => {
        this.isSaving.set(false);
        this.toastService.success(`Veículo ${newVehicle.plate} cadastrado com sucesso!`);
        this.vehicleCreated.emit(newVehicle);
        this.onClose();
      },
      error: (err) => {
        this.isSaving.set(false);
        const msg = this.extractErrorMessage(err, 'Erro ao cadastrar veículo. Verifique se a placa já não existe.');
        this.errorMessage.set(msg);
        this.toastService.error(msg);
      }
    });
  }

  private extractErrorMessage(err: any, fallback: string): string {
    const rawMsg = err?.error?.message;
    if (Array.isArray(rawMsg)) {
      return rawMsg.join(', ');
    }
    if (typeof rawMsg === 'string' && rawMsg.trim().length > 0) {
      if (rawMsg.toLowerCase() === 'internal server error') {
        return 'Erro interno no servidor. Tente novamente mais tarde.';
      }
      return rawMsg;
    }
    return fallback;
  }
}
