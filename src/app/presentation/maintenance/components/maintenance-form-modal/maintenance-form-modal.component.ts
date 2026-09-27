import { Component, EventEmitter, inject, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaintenanceType } from '../../../../domain/models/maintenance.model';
import { Vehicle } from '../../../../domain/models/vehicle.model';
import { Trip } from '../../../../domain/models/trip.model';
import {
  LucideAlertCircle,
  LucideAlertTriangle,
  LucideLoader2,
  LucideWrench,
  LucideX,
} from '@lucide/angular';

export interface MaintenanceFormSubmitPayload {
  vehicleId: string;
  type: MaintenanceType;
  description: string;
  serviceProvider?: string;
  scheduledDate?: string;
  startImmediately: boolean;
}

@Component({
  selector: 'app-maintenance-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideWrench,
    LucideX,
    LucideAlertCircle,
    LucideAlertTriangle,
    LucideLoader2,
  ],
  template: `
    @if (isOpen) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
          <!-- HEADER DO MODAL -->
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">
              <div class="size-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
                <svg lucideWrench class="size-4"></svg>
              </div>
              Registrar / Agendar Manutenção
            </h2>
            <button
              type="button"
              (click)="onClose()"
              class="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
            >
              <svg lucideX class="size-5"></svg>
            </button>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="p-6 space-y-4">
            <!-- Veículo -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Veículo *</label>
              <select
                formControlName="vehicleId"
                class="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
              >
                <option value="" disabled>Selecione um veículo da frota</option>
                @for (v of vehicles; track v.id) {
                  <option [value]="v.id">
                    {{ v.plate }} - {{ v.brand }} {{ v.model }} ({{ v.currentKm }} km)
                    @if (isVehicleInUse(v.id)) { [Em Viagem] }
                  </option>
                }
              </select>
              @if (form.get('vehicleId')?.touched && form.get('vehicleId')?.invalid) {
                <p class="text-[11px] text-rose-600 mt-1">Selecione o veículo.</p>
              }
            </div>

            <!-- Alerta contextual se o veículo selecionado estiver em viagem -->
            @if (getActiveTripForVehicle(form.get('vehicleId')?.value); as activeTrip) {
              <div class="p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl flex items-start gap-2.5 text-amber-900 text-xs animate-in fade-in duration-150">
                <svg lucideAlertTriangle class="size-4 text-amber-600 shrink-0 mt-0.5"></svg>
                <div class="space-y-0.5">
                  <div class="font-bold text-amber-900 flex items-center gap-1.5">
                    <span>Veículo em viagem no momento</span>
                  </div>
                  <div class="text-[11px] text-amber-800 leading-relaxed">
                    Previsão de chegada:
                    <strong class="font-bold text-amber-950">
                      {{ (activeTrip.estimatedArrivalDate || activeTrip.scheduledDate) | date:'dd/MM/yyyy HH:mm' }}
                    </strong>.
                    O agendamento só é permitido para data e horário posteriores à previsão de chegada.
                  </div>
                </div>
              </div>
            }

            <div class="grid grid-cols-2 gap-3">
              <!-- Tipo -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Tipo de Manutenção *</label>
                <select
                  formControlName="type"
                  class="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
                >
                  <option value="PREVENTIVA">Preventiva (Revisão periódica)</option>
                  <option value="CORRETIVA">Corretiva (Reparo de avaria)</option>
                </select>
              </div>

              <!-- Data Prevista -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Data e Hora Prevista
                  @if (getActiveTripForVehicle(form.get('vehicleId')?.value)) {
                    <span class="text-rose-600 font-bold">*</span>
                  }
                </label>
                <input
                  type="datetime-local"
                  formControlName="scheduledDate"
                  [min]="getMinScheduledDateTime()"
                  class="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <!-- Descrição -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Descrição do Serviço / Motivo *</label>
              <textarea
                formControlName="description"
                rows="3"
                placeholder="Ex: Troca de óleo de motor, filtro de combustível e pastilhas de freio dianteiras..."
                class="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              ></textarea>
              @if (form.get('description')?.touched && form.get('description')?.invalid) {
                <p class="text-[11px] text-rose-600 mt-1">A descrição é obrigatória (mínimo 3 caracteres).</p>
              }
            </div>

            <!-- Oficina / Prestador -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Oficina / Prestador de Serviço</label>
              <input
                type="text"
                formControlName="serviceProvider"
                placeholder="Ex: Auto Mecânica Silva & Irmãos"
                class="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            <!-- Iniciar Imediatamente -->
            <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-2">
              <div class="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="startImmediately"
                  formControlName="startImmediately"
                  [disabled]="isVehicleInUse(form.get('vehicleId')?.value)"
                  class="size-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <label
                  for="startImmediately"
                  class="text-xs text-slate-700 font-medium cursor-pointer"
                  [class.cursor-not-allowed]="isVehicleInUse(form.get('vehicleId')?.value)"
                >
                  Iniciar manutenção imediatamente <span class="text-slate-400 font-normal">(altera status do veículo para "Em Manutenção")</span>
                </label>
              </div>
              @if (isVehicleInUse(form.get('vehicleId')?.value)) {
                <p class="text-[11px] text-amber-700 flex items-center gap-1.5 pl-7 font-medium">
                  <svg lucideAlertTriangle class="size-3.5 shrink-0"></svg>
                  <span>Veículo selecionado está em viagem: só é permitido agendar a manutenção para após a previsão de chegada.</span>
                </p>
              }
            </div>

            @if (formValidationMessage || errorMessage) {
              <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs">
                <svg lucideAlertCircle class="size-4 text-rose-600 shrink-0"></svg>
                <span>{{ formValidationMessage || errorMessage }}</span>
              </div>
            }

            <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                (click)="onClose()"
                [disabled]="isLoading"
                class="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="isLoading"
                class="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                @if (isLoading) {
                  <svg lucideLoader2 class="size-4 animate-spin"></svg>
                }
                Salvar Manutenção
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class MaintenanceFormModalComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() isOpen = false;
  @Input() vehicles: Vehicle[] = [];
  @Input() activeTrips: Trip[] = [];
  @Input() isLoading = false;
  @Input() errorMessage: string | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<MaintenanceFormSubmitPayload>();

  formValidationMessage: string | null = null;

  form = this.fb.group({
    vehicleId: new FormControl('', [Validators.required]),
    type: new FormControl<MaintenanceType>('PREVENTIVA', [Validators.required]),
    description: new FormControl('', [Validators.required, Validators.minLength(3)]),
    serviceProvider: new FormControl(''),
    scheduledDate: new FormControl(''),
    startImmediately: new FormControl(false),
  });

  constructor() {
    this.form.get('vehicleId')?.valueChanges.subscribe(() => {
      this.formValidationMessage = null;
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.formValidationMessage = null;
      this.form.reset({
        vehicleId: '',
        type: 'PREVENTIVA',
        description: '',
        serviceProvider: '',
        scheduledDate: '',
        startImmediately: false,
      });
    }
  }

  getActiveTripForVehicle(vehicleId?: string | null): Trip | undefined {
    if (!vehicleId) return undefined;
    return this.activeTrips.find(
      (t) => t.vehicleId === vehicleId && (t.status === 'IN_PROGRESS' || t.status === 'EM_ANDAMENTO')
    );
  }

  getTripArrivalDate(trip: Trip): Date | null {
    const raw = trip.estimatedArrivalDate || trip.scheduledDate;
    return raw ? new Date(raw) : null;
  }

  getMinScheduledDateTime(): string | null {
    const vehicleId = this.form.get('vehicleId')?.value;
    const trip = this.getActiveTripForVehicle(vehicleId);
    if (!trip) return null;
    const arrival = this.getTripArrivalDate(trip);
    if (!arrival) return null;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${arrival.getFullYear()}-${pad(arrival.getMonth() + 1)}-${pad(arrival.getDate())}T${pad(arrival.getHours())}:${pad(arrival.getMinutes())}`;
  }

  isVehicleInUse(vehicleId?: string | null): boolean {
    if (!vehicleId) return false;
    if (this.getActiveTripForVehicle(vehicleId)) return true;
    const v = this.vehicles.find((veh) => veh.id === vehicleId);
    return v?.status === 'IN_USE' || v?.status === 'EM_VIAGEM';
  }

  onClose(): void {
    this.close.emit();
  }

  onSubmit(): void {
    this.formValidationMessage = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.value;

    const activeTrip = this.getActiveTripForVehicle(val.vehicleId);
    if (activeTrip) {
      const arrival = this.getTripArrivalDate(activeTrip);
      if (!val.scheduledDate) {
        this.formValidationMessage = 'O veículo está atualmente em viagem. Informe a data e hora prevista para após a previsão de chegada.';
        return;
      }

      if (arrival && new Date(val.scheduledDate).getTime() <= arrival.getTime()) {
        const arrivalFormatted = new Intl.DateTimeFormat('pt-BR', {
          dateStyle: 'short',
          timeStyle: 'short',
        }).format(arrival);
        this.formValidationMessage = `A data/hora do agendamento deve ser posterior à previsão de chegada (${arrivalFormatted}).`;
        return;
      }
    }

    this.save.emit({
      vehicleId: val.vehicleId!,
      type: val.type!,
      description: val.description!,
      serviceProvider: val.serviceProvider || undefined,
      scheduledDate: val.scheduledDate || undefined,
      startImmediately: !!val.startImmediately,
    });
  }
}

