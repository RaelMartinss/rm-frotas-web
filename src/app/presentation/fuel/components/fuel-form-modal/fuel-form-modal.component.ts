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
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-[#0F1215] rounded-2xl border border-[#222A2F] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
          <!-- Header do Modal -->
          <div class="px-6 py-4 border-b border-[#222A2F] flex items-center justify-between bg-[#0B0E11] shrink-0">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-[#171D21] text-[#FF6B00] rounded-xl border border-[#222A2F]">
                <svg lucideFuel class="size-5"></svg>
              </div>
              <div>
                <h3 class="text-sm font-bold text-white">
                  {{ isEdit() ? 'Editar Abastecimento' : 'Registrar Novo Abastecimento' }}
                </h3>
                <p class="text-[11px] text-[#929EAA]">Preencha os dados do abastecimento realizado</p>
              </div>
            </div>
            <button
              type="button"
              (click)="close.emit()"
              class="p-1.5 text-[#62707C] hover:text-white hover:bg-[#171D21] rounded-lg transition-colors cursor-pointer"
            >
              <svg lucideX class="size-4"></svg>
            </button>
          </div>

          <!-- Formulário com Scroll -->
          <form [formGroup]="fuelForm" (ngSubmit)="onSubmit()" class="p-6 overflow-y-auto space-y-4 text-xs">
            @if (errorMessage()) {
              <div class="p-3 bg-rose-950/20 text-rose-300 border border-rose-500/30 rounded-xl flex items-center gap-2">
                <svg lucideAlertCircle class="size-4 shrink-0 text-rose-400"></svg>
                <span>{{ errorMessage() }}</span>
              </div>
            }

            <!-- Veículo -->
            <div>
              <label class="block font-semibold text-[#CAD2D9] mb-1">Veículo *</label>
              <select
                formControlName="vehicleId"
                class="w-full px-3 py-2.5 bg-[#11161A] rounded-xl border border-[#222A2F] text-white focus:outline-none focus:border-[#FF6B00] cursor-pointer"
                [ngClass]="fuelForm.get('vehicleId')?.invalid && fuelForm.get('vehicleId')?.touched ? 'border-rose-500 bg-rose-950/20' : ''"
              >
                <option value="" disabled class="bg-[#11161A] text-white">Selecione o veículo</option>
                @for (v of vehicles(); track v.id) {
                  <option [value]="v.id" class="bg-[#11161A] text-white">{{ v.plate }} - {{ v.model }} (Atual: {{ v.currentKm | number }} km)</option>
                }
              </select>
              @if (getSelectedVehicleKm() !== null) {
                <p class="text-[11px] text-[#929EAA] mt-1">KM atual do veículo cadastrado: <strong class="text-white">{{ getSelectedVehicleKm() | number }} km</strong></p>
              }
            </div>

            <!-- Motorista (se Gestor) -->
            @if (!isDriverUser()) {
              <div>
                <label class="block font-semibold text-[#CAD2D9] mb-1">Motorista Responsável *</label>
                <select
                  formControlName="driverId"
                  class="w-full px-3 py-2.5 bg-[#11161A] rounded-xl border border-[#222A2F] text-white focus:outline-none focus:border-[#FF6B00] cursor-pointer"
                  [ngClass]="fuelForm.get('driverId')?.invalid && fuelForm.get('driverId')?.touched ? 'border-rose-500 bg-rose-950/20' : ''"
                >
                  <option value="" disabled class="bg-[#11161A] text-white">Selecione o motorista</option>
                  @for (d of drivers(); track d.id) {
                    <option [value]="d.id" class="bg-[#11161A] text-white">{{ d.name }} (CPF: {{ d.cpf }})</option>
                  }
                </select>
              </div>
            }

            <!-- Tipo de Combustível & Odômetro -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block font-semibold text-[#CAD2D9] mb-1">Tipo de Combustível *</label>
                <select
                  formControlName="fuelType"
                  class="w-full px-3 py-2.5 bg-[#11161A] rounded-xl border border-[#222A2F] text-white focus:outline-none focus:border-[#FF6B00] cursor-pointer"
                >
                  @for (ft of fuelTypes; track ft.value) {
                    <option [value]="ft.value" class="bg-[#11161A] text-white">{{ ft.label }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="block font-semibold text-[#CAD2D9] mb-1">Odômetro no Abastecimento (KM) *</label>
                <input
                  type="number"
                  formControlName="odometerAtFueling"
                  placeholder="Ex: 50250"
                  class="w-full px-3 py-2.5 bg-[#11161A] rounded-xl border border-[#222A2F] text-white focus:outline-none focus:border-[#FF6B00] placeholder:text-[#62707C]"
                  [ngClass]="fuelForm.get('odometerAtFueling')?.invalid && fuelForm.get('odometerAtFueling')?.touched ? 'border-rose-500 bg-rose-950/20' : ''"
                />
              </div>
            </div>

            <!-- Litros, Preço/L e Total -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block font-semibold text-[#CAD2D9] mb-1">Litros Abastecidos *</label>
                <input
                  type="number"
                  step="0.01"
                  formControlName="liters"
                  placeholder="Ex: 45.5"
                  class="w-full px-3 py-2.5 bg-[#11161A] rounded-xl border border-[#222A2F] text-white focus:outline-none focus:border-[#FF6B00] placeholder:text-[#62707C]"
                  [ngClass]="fuelForm.get('liters')?.invalid && fuelForm.get('liters')?.touched ? 'border-rose-500 bg-rose-950/20' : ''"
                />
              </div>

              <div>
                <label class="block font-semibold text-[#CAD2D9] mb-1">Preço por Litro (R$)</label>
                <input
                  type="number"
                  step="0.001"
                  formControlName="pricePerUnit"
                  placeholder="Ex: 5.89"
                  class="w-full px-3 py-2.5 bg-[#11161A] rounded-xl border border-[#222A2F] text-white focus:outline-none focus:border-[#FF6B00] placeholder:text-[#62707C]"
                />
              </div>

              <div>
                <label class="block font-semibold text-[#CAD2D9] mb-1">Valor Total (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  formControlName="totalCost"
                  placeholder="Ex: 267.99"
                  class="w-full px-3 py-2.5 bg-[#11161A] rounded-xl border border-[#222A2F] text-white font-bold focus:outline-none focus:border-[#FF6B00] placeholder:text-[#62707C]"
                  [ngClass]="fuelForm.get('totalCost')?.invalid && fuelForm.get('totalCost')?.touched ? 'border-rose-500 bg-rose-950/20' : ''"
                />
              </div>
            </div>

            <!-- TOGGLE EM DESTAQUE: TANQUE CHEIO -->
            <div class="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/30 flex items-start gap-3">
              <input
                type="checkbox"
                id="fullTankToggle"
                formControlName="fullTank"
                class="mt-1 size-4 accent-[#FF6B00] rounded cursor-pointer"
              />
              <label for="fullTankToggle" class="cursor-pointer">
                <span class="font-bold text-white text-xs flex items-center gap-1.5">
                  Encheu o tanque? (Tanque Cheio)
                  <span class="px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">Importante</span>
                </span>
                <p class="text-[11px] text-[#929EAA] mt-0.5">
                  Marcar esta opção é indispensável para que o sistema consiga calcular com exatidão o consumo médio (Km/L) entre os abastecimentos.
                </p>
              </label>
            </div>

            <!-- Posto de Gasolina & Data -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block font-semibold text-[#CAD2D9] mb-1">Posto de Combustível</label>
                <input
                  type="text"
                  formControlName="gasStation"
                  placeholder="Ex: Posto Ipiranga Centro"
                  class="w-full px-3 py-2.5 bg-[#11161A] rounded-xl border border-[#222A2F] text-white focus:outline-none focus:border-[#FF6B00] placeholder:text-[#62707C]"
                />
              </div>

              <div>
                <label class="block font-semibold text-[#CAD2D9] mb-1">Data e Hora do Abastecimento</label>
                <input
                  type="datetime-local"
                  formControlName="fueledAt"
                  class="w-full px-3 py-2.5 bg-[#11161A] rounded-xl border border-[#222A2F] text-white focus:outline-none focus:border-[#FF6B00]"
                />
              </div>
            </div>

            <!-- Comprovante / Foto da Nota Fiscal -->
            <div>
              <label class="block font-semibold text-[#CAD2D9] mb-1">Foto do Comprovante / Cupom Fiscal (Opcional)</label>
              @if (receiptPhotoPreview()) {
                <div class="p-3 bg-[#11161A] rounded-2xl border border-[#222A2F] flex items-center justify-between gap-3">
                  <div class="flex items-center gap-3 overflow-hidden">
                    <img
                      [src]="receiptPhotoPreview()"
                      alt="Prévia do comprovante"
                      class="size-14 rounded-xl object-cover border border-[#222A2F] shrink-0 bg-black/40 cursor-pointer"
                      (click)="openFullReceipt.emit(receiptPhotoPreview()!)"
                    />
                    <div class="truncate">
                      <span class="text-xs font-bold text-white block">Comprovante anexado</span>
                      <button
                        type="button"
                        (click)="openFullReceipt.emit(receiptPhotoPreview()!)"
                        class="text-[11px] text-[#FF6B00] hover:text-[#E05D00] font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
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
                    class="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer border border-rose-500/30 shrink-0"
                  >
                    <svg lucideTrash2 class="size-4"></svg>
                  </button>
                </div>
              } @else {
                <label class="flex flex-col items-center justify-center p-4 border-2 border-dashed border-[#222A2F] hover:border-[#FF6B00] rounded-2xl bg-[#11161A]/60 hover:bg-[#171D21]/60 cursor-pointer transition-all">
                  <div class="p-2 bg-[#171D21] rounded-xl shadow-2xs border border-[#222A2F] text-[#FF6B00] mb-1.5">
                    <svg lucideCamera class="size-5"></svg>
                  </div>
                  <span class="text-xs font-bold text-white">Clique para anexar foto do comprovante</span>
                  <span class="text-[11px] text-[#62707C] mt-0.5">JPG, PNG ou foto da câmera (comprimida automaticamente)</span>
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
              <label class="block font-semibold text-[#CAD2D9] mb-1">Observações</label>
              <textarea
                formControlName="notes"
                rows="2"
                placeholder="Alguma observação sobre o combustível ou posto..."
                class="w-full px-3 py-2.5 bg-[#11161A] rounded-xl border border-[#222A2F] text-white focus:outline-none focus:border-[#FF6B00] placeholder:text-[#62707C] resize-none"
              ></textarea>
            </div>

            <!-- Botões de Ação -->
            <div class="pt-3 border-t border-[#222A2F] flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                (click)="close.emit()"
                class="px-4 py-2.5 text-xs font-semibold text-[#929EAA] hover:text-white hover:bg-[#171D21] rounded-xl transition-colors cursor-pointer border border-[#222A2F]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="isSubmitting()"
                class="px-5 py-2.5 text-xs font-bold text-[#080B0C] bg-[#FF6B00] hover:bg-[#E05D00] disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
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
  readonly preselectedVehicleId = input<string | null>(null);
  readonly preselectedDriverId = input<string | null>(null);

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
      const initialVehicle = this.preselectedVehicleId() || '';
      const initialDriver = this.preselectedDriverId() || '';
      this.fuelForm.reset({
        fuelType: 'GASOLINA',
        fullTank: true,
        vehicleId: initialVehicle,
        driverId: initialDriver,
        fueledAt: this.getNowDateTimeString()
      });

      if (initialVehicle) {
        const found = this.vehicles().find((v) => v.id === initialVehicle);
        if (found) {
          this.fuelForm.get('odometerAtFueling')?.setValue(found.currentKm);
        }
      }
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
