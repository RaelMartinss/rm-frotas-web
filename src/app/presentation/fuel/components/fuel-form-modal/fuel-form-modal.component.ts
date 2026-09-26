import { Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  LucideFuel,
  LucideX,
  LucideAlertCircle,
  LucideCamera,
  LucideExternalLink,
  LucideTrash2,
  LucideLoader2
} from '@lucide/angular';
import { FuelRecord, FuelType } from '../../../../domain/models/fuel.model';
import { Vehicle } from '../../../../domain/models/vehicle.model';
import { Driver } from '../../../../domain/models/driver.model';
import { compressImage } from '../../../../core/utils/image-compressor';

export interface FuelFormSubmitPayload {
  formValue: {
    vehicleId: string;
    driverId?: string;
    fuelType: FuelType;
    liters: number;
    pricePerUnit?: number;
    totalCost: number;
    odometerAtFueling: number;
    gasStation?: string;
    fullTank: boolean;
    receiptUrl?: string;
    notes?: string;
    fueledAt: string;
  };
}

@Component({
  selector: 'app-fuel-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    ReactiveFormsModule,
    LucideFuel,
    LucideX,
    LucideAlertCircle,
    LucideCamera,
    LucideExternalLink,
    LucideTrash2,
    LucideLoader2
  ],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
          <!-- Header do Modal -->
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <svg lucideFuel class="size-5"></svg>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-800">
                  {{ isEdit() ? 'Editar Abastecimento' : 'Registrar Novo Abastecimento' }}
                </h3>
                <p class="text-[11px] text-slate-400">Preencha os dados do abastecimento realizado</p>
              </div>
            </div>
            <button
              type="button"
              (click)="close.emit()"
              class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <svg lucideX class="size-4"></svg>
            </button>
          </div>

          <!-- Formulário com Scroll -->
          <form [formGroup]="fuelForm" (ngSubmit)="onSubmit()" class="p-6 overflow-y-auto space-y-4 text-xs">
            @if (errorMessage()) {
              <div class="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl flex items-center gap-2">
                <svg lucideAlertCircle class="size-4 shrink-0"></svg>
                <span>{{ errorMessage() }}</span>
              </div>
            }

            <!-- Veículo -->
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Veículo *</label>
              <select
                formControlName="vehicleId"
                class="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                [ngClass]="fuelForm.get('vehicleId')?.invalid && fuelForm.get('vehicleId')?.touched ? 'border-rose-300 bg-rose-50/30' : ''"
              >
                <option value="" disabled>Selecione o veículo</option>
                @for (v of vehicles(); track v.id) {
                  <option [value]="v.id">{{ v.plate }} - {{ v.model }} (Atual: {{ v.currentKm | number }} km)</option>
                }
              </select>
              @if (getSelectedVehicleKm() !== null) {
                <p class="text-[11px] text-slate-400 mt-1">KM atual do veículo cadastrado: <strong class="text-slate-700">{{ getSelectedVehicleKm() | number }} km</strong></p>
              }
            </div>

            <!-- Motorista (se Gestor) -->
            @if (!isDriverUser()) {
              <div>
                <label class="block font-semibold text-slate-700 mb-1">Motorista Responsável *</label>
                <select
                  formControlName="driverId"
                  class="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                  [ngClass]="fuelForm.get('driverId')?.invalid && fuelForm.get('driverId')?.touched ? 'border-rose-300 bg-rose-50/30' : ''"
                >
                  <option value="" disabled>Selecione o motorista</option>
                  @for (d of drivers(); track d.id) {
                    <option [value]="d.id">{{ d.name }} (CPF: {{ d.cpf }})</option>
                  }
                </select>
              </div>
            }

            <!-- Tipo de Combustível & Odômetro -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block font-semibold text-slate-700 mb-1">Tipo de Combustível *</label>
                <select
                  formControlName="fuelType"
                  class="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                >
                  @for (ft of fuelTypes; track ft.value) {
                    <option [value]="ft.value">{{ ft.label }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="block font-semibold text-slate-700 mb-1">Odômetro no Abastecimento (KM) *</label>
                <input
                  type="number"
                  formControlName="odometerAtFueling"
                  placeholder="Ex: 50250"
                  class="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  [ngClass]="fuelForm.get('odometerAtFueling')?.invalid && fuelForm.get('odometerAtFueling')?.touched ? 'border-rose-300 bg-rose-50/30' : ''"
                />
              </div>
            </div>

            <!-- Litros, Preço/L e Total -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block font-semibold text-slate-700 mb-1">Litros Abastecidos *</label>
                <input
                  type="number"
                  step="0.01"
                  formControlName="liters"
                  placeholder="Ex: 45.5"
                  class="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  [ngClass]="fuelForm.get('liters')?.invalid && fuelForm.get('liters')?.touched ? 'border-rose-300 bg-rose-50/30' : ''"
                />
              </div>

              <div>
                <label class="block font-semibold text-slate-700 mb-1">Preço por Litro (R$)</label>
                <input
                  type="number"
                  step="0.001"
                  formControlName="pricePerUnit"
                  placeholder="Ex: 5.89"
                  class="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label class="block font-semibold text-slate-700 mb-1">Valor Total (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  formControlName="totalCost"
                  placeholder="Ex: 267.99"
                  class="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  [ngClass]="fuelForm.get('totalCost')?.invalid && fuelForm.get('totalCost')?.touched ? 'border-rose-300 bg-rose-50/30' : ''"
                />
              </div>
            </div>

            <!-- TOGGLE EM DESTAQUE: TANQUE CHEIO -->
            <div class="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 flex items-start gap-3">
              <input
                type="checkbox"
                id="fullTankToggle"
                formControlName="fullTank"
                class="mt-1 size-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <label for="fullTankToggle" class="cursor-pointer">
                <span class="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  Encheu o tanque? (Tanque Cheio)
                  <span class="px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-200 text-emerald-800 font-bold">Importante</span>
                </span>
                <p class="text-[11px] text-slate-500 mt-0.5">
                  Marcar esta opção é indispensável para que o sistema consiga calcular com exatidão o consumo médio (Km/L) entre os abastecimentos.
                </p>
              </label>
            </div>

            <!-- Posto de Gasolina & Data -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block font-semibold text-slate-700 mb-1">Posto de Combustível</label>
                <input
                  type="text"
                  formControlName="gasStation"
                  placeholder="Ex: Posto Ipiranga Centro"
                  class="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label class="block font-semibold text-slate-700 mb-1">Data e Hora do Abastecimento</label>
                <input
                  type="datetime-local"
                  formControlName="fueledAt"
                  class="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <!-- Comprovante / Foto da Nota Fiscal -->
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Foto do Comprovante / Cupom Fiscal (Opcional)</label>
              @if (receiptPhotoPreview()) {
                <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                  <div class="flex items-center gap-3 overflow-hidden">
                    <img
                      [src]="receiptPhotoPreview()"
                      alt="Prévia do comprovante"
                      class="size-14 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-900/10 cursor-pointer"
                      (click)="openFullReceipt.emit(receiptPhotoPreview()!)"
                    />
                    <div class="truncate">
                      <span class="text-xs font-bold text-slate-800 block">Comprovante anexado</span>
                      <button
                        type="button"
                        (click)="openFullReceipt.emit(receiptPhotoPreview()!)"
                        class="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        Ver foto cheia
                        <svg lucideExternalLink class="size-3"></svg>
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    (click)="removeReceiptPhoto()"
                    title="Remover foto"
                    class="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-rose-200/60 shrink-0"
                  >
                    <svg lucideTrash2 class="size-4"></svg>
                  </button>
                </div>
              } @else {
                <label class="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl bg-slate-50/70 hover:bg-emerald-50/30 cursor-pointer transition-all">
                  <div class="p-2 bg-white rounded-xl shadow-2xs border border-slate-100 text-slate-500 mb-1.5">
                    <svg lucideCamera class="size-5 text-emerald-600"></svg>
                  </div>
                  <span class="text-xs font-bold text-slate-700">Clique para anexar foto do comprovante</span>
                  <span class="text-[11px] text-slate-400 mt-0.5">JPG, PNG ou foto da câmera (comprimida automaticamente)</span>
                  <input
                    type="file"
                    accept="image/*"
                    (change)="onReceiptFileSelected($event)"
                    class="hidden"
                  />
                </label>
              }
            </div>

            <!-- Observações -->
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Observações</label>
              <textarea
                formControlName="notes"
                rows="2"
                placeholder="Alguma observação sobre o combustível ou posto..."
                class="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
              ></textarea>
            </div>

            <!-- Botões de Ação -->
            <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                (click)="close.emit()"
                class="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="isSubmitting()"
                class="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                @if (isSubmitting()) {
                  <svg lucideLoader2 class="size-4 animate-spin"></svg>
                  <span>Salvando...</span>
                } @else {
                  <span>{{ isEdit() ? 'Atualizar Abastecimento' : 'Registrar Abastecimento' }}</span>
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `
})
export class FuelFormModalComponent {
  private readonly fb = inject(FormBuilder);

  readonly isOpen = input<boolean>(false);
  readonly isEdit = input<boolean>(false);
  readonly record = input<FuelRecord | null>(null);
  readonly vehicles = input<Vehicle[]>([]);
  readonly drivers = input<Driver[]>([]);
  readonly isDriverUser = input<boolean>(false);
  readonly isSubmitting = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly close = output<void>();
  readonly save = output<FuelFormSubmitPayload>();
  readonly openFullReceipt = output<string>();

  readonly receiptPhotoPreview = signal<string | null>(null);

  readonly fuelTypes: { value: FuelType; label: string }[] = [
    { value: 'GASOLINA', label: 'Gasolina Comum' },
    { value: 'ETANOL', label: 'Etanol' },
    { value: 'DIESEL', label: 'Diesel Comum' },
    { value: 'DIESEL_S10', label: 'Diesel S-10' },
    { value: 'GNV', label: 'GNV' },
    { value: 'ELETRICO', label: 'Elétrico' }
  ];

  fuelForm: FormGroup = this.buildForm();

  constructor() {
    this.setupFormSubscribers();

    effect(() => {
      const open = this.isOpen();
      const isEditMode = this.isEdit();
      const currentRecord = this.record();

      if (open) {
        this.resetOrPopulateForm(isEditMode, currentRecord);
      }
    });
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      vehicleId: ['', Validators.required],
      driverId: [''],
      fuelType: ['GASOLINA', Validators.required],
      liters: [null, [Validators.required, Validators.min(0.01)]],
      pricePerUnit: [null, [Validators.min(0.001)]],
      totalCost: [null, [Validators.required, Validators.min(0.01)]],
      odometerAtFueling: [null, [Validators.required, Validators.min(0)]],
      gasStation: [''],
      fullTank: [true],
      receiptUrl: [''],
      notes: [''],
      fueledAt: [this.getNowDateTimeString(), Validators.required]
    });
  }

  private setupFormSubscribers(): void {
    this.fuelForm.get('liters')?.valueChanges.subscribe((liters) => {
      const price = this.fuelForm.get('pricePerUnit')?.value;
      if (liters && price && price > 0) {
        const total = Math.round(Number(liters) * Number(price) * 100) / 100;
        this.fuelForm.get('totalCost')?.setValue(total, { emitEvent: false });
      }
    });

    this.fuelForm.get('pricePerUnit')?.valueChanges.subscribe((price) => {
      const liters = this.fuelForm.get('liters')?.value;
      if (liters && price && liters > 0) {
        const total = Math.round(Number(liters) * Number(price) * 100) / 100;
        this.fuelForm.get('totalCost')?.setValue(total, { emitEvent: false });
      }
    });

    this.fuelForm.get('vehicleId')?.valueChanges.subscribe((vId) => {
      if (vId) {
        const found = this.vehicles().find((v) => v.id === vId);
        if (found && !this.fuelForm.get('odometerAtFueling')?.value) {
          this.fuelForm.get('odometerAtFueling')?.setValue(found.currentKm);
        }
      }
    });
  }

  private resetOrPopulateForm(isEditMode: boolean, record: FuelRecord | null): void {
    if (isEditMode && record) {
      this.receiptPhotoPreview.set(record.receiptUrl || null);
      this.fuelForm.patchValue({
        vehicleId: record.vehicleId,
        driverId: record.driverId,
        fuelType: record.fuelType,
        liters: record.liters,
        pricePerUnit: record.pricePerUnit,
        totalCost: record.totalCost,
        odometerAtFueling: record.odometerAtFueling,
        gasStation: record.gasStation || '',
        fullTank: record.fullTank ?? true,
        receiptUrl: record.receiptUrl || '',
        notes: record.notes || '',
        fueledAt: this.formatDateForInput(record.fueledAt)
      });
    } else {
      this.receiptPhotoPreview.set(null);
      this.fuelForm.reset({
        fuelType: 'GASOLINA',
        fullTank: true,
        vehicleId: '',
        driverId: '',
        fueledAt: this.getNowDateTimeString()
      });
    }

    if (!this.isDriverUser()) {
      this.fuelForm.get('driverId')?.setValidators(Validators.required);
    } else {
      this.fuelForm.get('driverId')?.clearValidators();
    }
    this.fuelForm.get('driverId')?.updateValueAndValidity();
  }

  getSelectedVehicleKm(): number | null {
    const vId = this.fuelForm.get('vehicleId')?.value;
    if (!vId) return null;
    const v = this.vehicles().find((veh) => veh.id === vId);
    return v ? v.currentKm : null;
  }

  async onReceiptFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    try {
      const compressedBase64 = await compressImage(file, 1280, 1280, 0.75);
      this.receiptPhotoPreview.set(compressedBase64);
      this.fuelForm.get('receiptUrl')?.setValue(compressedBase64);
    } catch (err) {
      console.error('Erro ao comprimir imagem de comprovante:', err);
      const reader = new FileReader();
      reader.onload = (e) => {
        const res = e.target?.result as string;
        this.receiptPhotoPreview.set(res);
        this.fuelForm.get('receiptUrl')?.setValue(res);
      };
      reader.readAsDataURL(file);
    }
  }

  removeReceiptPhoto(): void {
    this.receiptPhotoPreview.set(null);
    this.fuelForm.get('receiptUrl')?.setValue('');
  }

  onSubmit(): void {
    if (this.fuelForm.invalid) {
      this.fuelForm.markAllAsTouched();
      return;
    }
    this.save.emit({
      formValue: this.fuelForm.value
    });
  }

  private formatDateForInput(date: string | Date): string {
    const d = new Date(date);
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private getNowDateTimeString(): string {
    const now = new Date();
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }
}
