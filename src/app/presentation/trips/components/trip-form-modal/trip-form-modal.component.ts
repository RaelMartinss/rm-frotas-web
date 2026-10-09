import { Component, effect, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucideNavigation,
  LucideX,
  LucideAlertCircle,
  LucideLoader2,
  LucideCalendar,
  LucideMapPin,
} from '@lucide/angular';
import { Vehicle } from '../../../../domain/models/vehicle.model';
import { Driver } from '../../../../domain/models/driver.model';
import { CreateTripDTO } from '../../../../domain/models/trip.model';

@Component({
  selector: 'app-trip-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideNavigation,
    LucideX,
    LucideAlertCircle,
    LucideLoader2,
    LucideCalendar,
    LucideMapPin,
  ],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-[#0F1215] rounded-2xl border border-[#222A2F] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150">
          <div class="px-6 py-4 border-b border-[#222A2F] flex items-center justify-between bg-[#0B0E11]">
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                <div class="size-7 rounded-lg bg-[#171D21] text-[#FF6B00] flex items-center justify-center border border-[#222A2F]">
                  <svg lucideNavigation class="size-4"></svg>
                </div>
                Lançar Nova Viagem
              </h2>
              <p class="text-[11px] text-[#929EAA] mt-0.5 ml-9">Defina o trajeto, condutor e caminhão escalado para o despacho.</p>
            </div>
            <button
              type="button"
              (click)="close.emit()"
              class="text-[#62707C] hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <svg lucideX class="size-5"></svg>
            </button>
          </div>

          <form [formGroup]="tripForm" (ngSubmit)="onSubmit()" class="p-6 space-y-4">
            @if (errorMessage()) {
              <div class="p-3 bg-rose-950/20 border border-rose-500/30 rounded-xl flex items-start gap-2 text-rose-300 text-xs">
                <svg lucideAlertCircle class="size-4 text-rose-400 shrink-0 mt-0.5"></svg>
                <div class="flex-1">
                  <span class="font-semibold text-rose-200">Erro no cadastro:</span> {{ errorMessage() }}
                </div>
              </div>
            }

            <!-- Veículo e Motorista -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-[#CAD2D9] mb-1 flex items-center justify-between">
                  <span>Veículo da Frota <span class="text-rose-400">*</span></span>
                  @if (loadingAvailability()) {
                    <span class="text-[10px] text-[#62707C] font-normal flex items-center gap-1">
                      <svg lucideLoader2 class="size-2.5 animate-spin"></svg> Verificando...
                    </span>
                  }
                </label>
                <select
                  formControlName="vehicleId"
                  class="w-full bg-[#11161A] border rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#FF6B00] transition-all disabled:opacity-60 cursor-pointer"
                  [disabled]="loadingAvailability()"
                  [ngClass]="(tripForm.get('vehicleId')?.invalid && tripForm.get('vehicleId')?.touched) ? 'border-rose-500 bg-rose-950/20' : 'border-[#222A2F]'"
                >
                  <option value="" class="bg-[#11161A] text-white">{{ loadingAvailability() ? 'Carregando veículos...' : 'Selecione um veículo disponível...' }}</option>
                  @for (v of availableVehicles(); track v.id) {
                    <option [value]="v.id" class="bg-[#11161A] text-white">{{ v.plate }} - {{ v.model }} ({{ v.brand }})</option>
                  }
                </select>
                @if (tripForm.get('vehicleId')?.touched && tripForm.get('vehicleId')?.errors?.['required']) {
                  <p class="text-[10px] text-rose-400 mt-1 font-medium">Selecione o veículo.</p>
                }
                @if (!loadingAvailability() && availableVehicles().length === 0) {
                  <p class="text-[10px] text-amber-400 mt-1 font-medium">Nenhum veículo disponível ou livre no momento.</p>
                }
              </div>

              <div>
                <label class="block text-xs font-semibold text-[#CAD2D9] mb-1 flex items-center justify-between">
                  <span>Motorista Escalado <span class="text-rose-400">*</span></span>
                  @if (loadingAvailability()) {
                    <span class="text-[10px] text-[#62707C] font-normal flex items-center gap-1">
                      <svg lucideLoader2 class="size-2.5 animate-spin"></svg> Verificando...
                    </span>
                  }
                </label>
                <select
                  formControlName="driverId"
                  class="w-full bg-[#11161A] border rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#FF6B00] transition-all disabled:opacity-60 cursor-pointer"
                  [disabled]="loadingAvailability()"
                  [ngClass]="(tripForm.get('driverId')?.invalid && tripForm.get('driverId')?.touched) ? 'border-rose-500 bg-rose-950/20' : 'border-[#222A2F]'"
                >
                  <option value="" class="bg-[#11161A] text-white">{{ loadingAvailability() ? 'Carregando motoristas...' : 'Selecione um motorista disponível...' }}</option>
                  @for (d of availableDrivers(); track d.id) {
                    <option [value]="d.id" class="bg-[#11161A] text-white">{{ d.name }} (CNH: {{ d.cnhNumber }})</option>
                  }
                </select>
                @if (tripForm.get('driverId')?.touched && tripForm.get('driverId')?.errors?.['required']) {
                  <p class="text-[10px] text-rose-400 mt-1 font-medium">Selecione o motorista.</p>
                }
                @if (!loadingAvailability() && availableDrivers().length === 0) {
                  <p class="text-[10px] text-amber-400 mt-1 font-medium">Nenhum motorista ativo ou livre no momento.</p>
                }
              </div>
            </div>

            <!-- Datas: Saída Prevista e Previsão de Chegada -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="p-3.5 bg-[#11161A] rounded-xl border border-[#222A2F]">
                <label class="block text-xs font-semibold text-[#CAD2D9] mb-1 flex items-center gap-1.5">
                  <svg lucideCalendar class="size-3.5 text-[#FF6B00]"></svg>
                  <span>Data/Hora Saída Prevista <span class="text-rose-400">*</span></span>
                </label>
                <input
                  type="datetime-local"
                  formControlName="scheduledDate"
                  class="w-full bg-[#0B0E11] border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-[#FF6B00] transition-colors"
                  [ngClass]="(tripForm.get('scheduledDate')?.invalid && tripForm.get('scheduledDate')?.touched) ? 'border-rose-500 bg-rose-950/20' : 'border-[#222A2F]'"
                />
                @if (tripForm.get('scheduledDate')?.touched && tripForm.get('scheduledDate')?.errors?.['required']) {
                  <p class="text-[10px] text-rose-400 mt-1 font-medium">Informe a data e horário previstos para a saída.</p>
                }
              </div>

              <div class="p-3.5 bg-[#11161A] rounded-xl border border-[#222A2F]">
                <label class="block text-xs font-semibold text-[#CAD2D9] mb-1 flex items-center gap-1.5">
                  <svg lucideCalendar class="size-3.5 text-blue-400"></svg>
                  <span>Previsão de Chegada</span>
                </label>
                <input
                  type="datetime-local"
                  formControlName="estimatedArrivalDate"
                  class="w-full bg-[#0B0E11] border border-[#222A2F] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-[#FF6B00] transition-colors"
                />
                <p class="text-[10px] text-[#62707C] mt-1 font-normal">Data e hora estimada para conclusão.</p>
              </div>
            </div>

            <!-- Origem -->
            <div class="p-3.5 bg-[#11161A] rounded-xl border border-[#222A2F] space-y-3">
              <div class="text-xs font-bold text-white flex items-center gap-1.5">
                <svg lucideMapPin class="size-3.5 text-[#FF6B00]"></svg>
                Local de Origem
              </div>
              <div>
                <label class="block text-[11px] font-medium text-[#929EAA] mb-1">Logradouro / Ponto de Partida <span class="text-rose-400">*</span></label>
                <input
                  type="text"
                  formControlName="originAddress"
                  placeholder="Ex: Pátio Matriz - Av. Transamazônica, 500"
                  class="w-full bg-[#0B0E11] border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-[#FF6B00] transition-colors placeholder:text-[#62707C]"
                  [ngClass]="(tripForm.get('originAddress')?.invalid && tripForm.get('originAddress')?.touched) ? 'border-rose-500 bg-rose-950/20' : 'border-[#222A2F]'"
                />
              </div>
              <div class="grid grid-cols-3 gap-3">
                <div class="col-span-2">
                  <label class="block text-[11px] font-medium text-[#929EAA] mb-1">Cidade <span class="text-rose-400">*</span></label>
                  <input
                    type="text"
                    formControlName="originCity"
                    placeholder="Ex: Paragominas"
                    class="w-full bg-[#0B0E11] border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-[#FF6B00] transition-colors placeholder:text-[#62707C]"
                    [ngClass]="(tripForm.get('originCity')?.invalid && tripForm.get('originCity')?.touched) ? 'border-rose-500 bg-rose-950/20' : 'border-[#222A2F]'"
                  />
                </div>
                <div>
                  <label class="block text-[11px] font-medium text-[#929EAA] mb-1">UF <span class="text-rose-400">*</span></label>
                  <select
                    formControlName="originState"
                    class="w-full bg-[#0B0E11] border border-[#222A2F] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-[#FF6B00] transition-colors cursor-pointer"
                  >
                    @for (uf of states(); track uf) {
                      <option [value]="uf" class="bg-[#11161A] text-white">{{ uf }}</option>
                    }
                  </select>
                </div>
              </div>
            </div>

            <!-- Destino -->
            <div class="p-3.5 bg-[#11161A] rounded-xl border border-[#222A2F] space-y-3">
              <div class="text-xs font-bold text-white flex items-center gap-1.5">
                <svg lucideMapPin class="size-3.5 text-blue-400"></svg>
                Local de Destino
              </div>
              <div>
                <label class="block text-[11px] font-medium text-[#929EAA] mb-1">Logradouro / Ponto de Chegada <span class="text-rose-400">*</span></label>
                <input
                  type="text"
                  formControlName="destinationAddress"
                  placeholder="Ex: Porto de Belém / Av. Almirante Barroso"
                  class="w-full bg-[#0B0E11] border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-[#FF6B00] transition-colors placeholder:text-[#62707C]"
                  [ngClass]="(tripForm.get('destinationAddress')?.invalid && tripForm.get('destinationAddress')?.touched) ? 'border-rose-500 bg-rose-950/20' : 'border-[#222A2F]'"
                />
              </div>
              <div class="grid grid-cols-3 gap-3">
                <div class="col-span-2">
                  <label class="block text-[11px] font-medium text-[#929EAA] mb-1">Cidade <span class="text-rose-400">*</span></label>
                  <input
                    type="text"
                    formControlName="destinationCity"
                    placeholder="Ex: Belém"
                    class="w-full bg-[#0B0E11] border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-[#FF6B00] transition-colors placeholder:text-[#62707C]"
                    [ngClass]="(tripForm.get('destinationCity')?.invalid && tripForm.get('destinationCity')?.touched) ? 'border-rose-500 bg-rose-950/20' : 'border-[#222A2F]'"
                  />
                </div>
                <div>
                  <label class="block text-[11px] font-medium text-[#929EAA] mb-1">UF <span class="text-rose-400">*</span></label>
                  <select
                    formControlName="destinationState"
                    class="w-full bg-[#0B0E11] border border-[#222A2F] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-[#FF6B00] transition-colors cursor-pointer"
                  >
                    @for (uf of states(); track uf) {
                      <option [value]="uf" class="bg-[#11161A] text-white">{{ uf }}</option>
                    }
                  </select>
                </div>
              </div>
            </div>

            <!-- Observações -->
            <div class="p-3.5 bg-[#11161A] rounded-xl border border-[#222A2F]">
              <label class="block text-xs font-semibold text-[#CAD2D9] mb-1">Observações da Viagem</label>
              <input
                type="text"
                formControlName="notes"
                placeholder="Ex: Entrega de materiais, Sem intercorrências, Viagem urgente..."
                class="w-full bg-[#0B0E11] border border-[#222A2F] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-[#FF6B00] transition-colors placeholder:text-[#62707C]"
              />
            </div>

            <div class="pt-4 border-t border-[#222A2F] flex items-center justify-end gap-3">
              <button
                type="button"
                (click)="close.emit()"
                class="px-4 py-2 text-xs font-semibold text-[#929EAA] hover:text-white hover:bg-[#171D21] rounded-xl transition-colors cursor-pointer border border-[#222A2F]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="isSaving()"
                class="px-5 py-2 text-xs font-bold text-[#080B0C] bg-[#FF6B00] hover:bg-[#E05D00] rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                @if (isSaving()) {
                  <svg lucideLoader2 class="size-4 animate-spin"></svg>
                }
                Salvar Viagem
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `
})
export class TripFormModalComponent {
  private readonly fb = inject(FormBuilder);

  readonly isOpen = input<boolean>(false);
  readonly isSaving = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);
  readonly availableVehicles = input<Vehicle[]>([]);
  readonly availableDrivers = input<Driver[]>([]);
  readonly loadingAvailability = input<boolean>(false);
  readonly states = input<string[]>([]);

  readonly close = output<void>();
  readonly save = output<CreateTripDTO>();

  tripForm: FormGroup = this.fb.group({
    vehicleId: ['', [Validators.required]],
    driverId: ['', [Validators.required]],
    scheduledDate: [this.getDefaultScheduledDate(), [Validators.required]],
    estimatedArrivalDate: [this.getDefaultArrivalDate()],
    notes: [''],
    originAddress: ['', [Validators.required, Validators.minLength(3)]],
    originCity: ['', [Validators.required]],
    originState: ['PA', [Validators.required, Validators.maxLength(2)]],
    destinationAddress: ['', [Validators.required, Validators.minLength(3)]],
    destinationCity: ['', [Validators.required]],
    destinationState: ['PA', [Validators.required, Validators.maxLength(2)]],
  });

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.tripForm.reset({
          originState: 'PA',
          destinationState: 'PA',
          vehicleId: '',
          driverId: '',
          scheduledDate: this.getDefaultScheduledDate(),
          estimatedArrivalDate: this.getDefaultArrivalDate(),
          notes: '',
          originAddress: '',
          originCity: '',
          destinationAddress: '',
          destinationCity: '',
        });
      }
    });
  }

  private getDefaultScheduledDate(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  }

  private getDefaultArrivalDate(): string {
    const now = new Date();
    now.setHours(now.getHours() + 4);
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  }

  onSubmit(): void {
    if (this.tripForm.invalid) {
      this.tripForm.markAllAsTouched();
      return;
    }

    const val = this.tripForm.value;
    const scheduledDateIso = val.scheduledDate
      ? new Date(val.scheduledDate).toISOString()
      : undefined;

    const estimatedArrivalDateIso = val.estimatedArrivalDate
      ? new Date(val.estimatedArrivalDate).toISOString()
      : undefined;

    const payload: CreateTripDTO = {
      driverId: val.driverId,
      vehicleId: val.vehicleId,
      scheduledDate: scheduledDateIso,
      estimatedArrivalDate: estimatedArrivalDateIso,
      notes: val.notes?.trim() || undefined,
      origin: {
        address: val.originAddress?.trim(),
        city: val.originCity?.trim(),
        state: val.originState?.trim().toUpperCase(),
      },
      destination: {
        address: val.destinationAddress?.trim(),
        city: val.destinationCity?.trim(),
        state: val.destinationState?.trim().toUpperCase(),
      },
    };

    this.save.emit(payload);
  }
}
