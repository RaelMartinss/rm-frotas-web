import { Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IMaintenanceRepository } from '../../../../domain/repositories/maintenance.repository.interface';
import { ToastService } from '../../../../core/services/toast.service';
import { Vehicle } from '../../../../domain/models/vehicle.model';
import { ModalShellComponent } from '../../../shared/components/modal-shell/modal-shell.component';
import { getVehicleBrandLogo } from '../../../../core/utils/vehicle-brand.util';
import {
  LucideWrench,
  LucideLoader2,
  LucideAlertCircle,
  LucideAlertTriangle
} from '@lucide/angular';

@Component({
  selector: 'app-vehicle-send-maintenance-modal',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    ReactiveFormsModule,
    ModalShellComponent,
    LucideWrench,
    LucideLoader2,
    LucideAlertCircle,
    LucideAlertTriangle
  ],
  template: `
    <app-modal-shell
      [isOpen]="isOpen()"
      title="Registrar / Agendar Manutenção"
      maxWidth="lg"
      (close)="onClose()"
    >
      <div header-icon class="size-7 rounded-lg bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center border border-[#FF6B00]/20 shadow-2xs">
        <svg lucideWrench class="size-4"></svg>
      </div>

      <form [formGroup]="sendMaintenanceForm" (ngSubmit)="confirmSendMaintenance()" class="p-6 space-y-4">
        <!-- Veículo Selecionado (Card de Destaque) -->
        <div class="p-3.5 bg-[#11161A] rounded-xl border border-[#222A2F] flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="size-9 rounded-lg bg-[#0F1215] border border-[#222A2F] flex items-center justify-center text-white font-mono font-bold text-xs shadow-2xs p-1">
              @if (getBrandLogo(vehicle()?.brand); as logo) {
                <img [src]="logo" [alt]="vehicle()?.brand ?? ''" class="size-full object-contain" />
              } @else {
                {{ vehicle()?.plate?.substring(0, 3) }}
              }
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-white font-mono text-sm">{{ vehicle()?.plate }}</span>
                <span class="text-xs text-[#8E9DA8] font-medium">• {{ vehicle()?.brand }} {{ vehicle()?.model }}</span>
              </div>
              <div class="text-[11px] text-[#8E9DA8] mt-0.5">
                KM Atual: <span class="font-mono font-semibold text-white">{{ vehicle()?.currentKm | number }} km</span>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <!-- Tipo -->
          <div>
            <label class="block text-xs font-semibold text-[#8E9DA8] mb-1">Tipo de Manutenção *</label>
            <select
              formControlName="type"
              class="w-full text-xs bg-[#11161A] border border-[#222A2F] rounded-xl px-3 py-2.5 text-white focus:outline-hidden focus:border-[#FF6B00] transition-all cursor-pointer [&>option]:bg-[#11161A] [&>option]:text-white"
            >
              <option value="PREVENTIVA">Preventiva (Revisão periódica)</option>
              <option value="CORRETIVA">Corretiva (Reparo de avaria)</option>
            </select>
          </div>

          <!-- Data Prevista -->
          <div>
            <label class="block text-xs font-semibold text-[#8E9DA8] mb-1">Data Prevista</label>
            <input
              type="date"
              formControlName="scheduledDate"
              class="w-full text-xs bg-[#11161A] border border-[#222A2F] rounded-xl px-3 py-2.5 text-white focus:outline-hidden focus:border-[#FF6B00] transition-all"
            />
          </div>
        </div>

        <!-- Descrição -->
        <div>
          <label class="block text-xs font-semibold text-[#8E9DA8] mb-1">Descrição do Serviço / Motivo *</label>
          <textarea
            formControlName="description"
            rows="3"
            placeholder="Ex: Troca de óleo, pastilhas de freio, revisão do motor ou reparo emergencial..."
            class="w-full text-xs bg-[#11161A] border border-[#222A2F] rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-[#FF6B00] transition-all placeholder:text-[#62707C]"
          ></textarea>
          @if (sendMaintenanceForm.get('description')?.touched && sendMaintenanceForm.get('description')?.invalid) {
            <p class="text-[11px] text-rose-400 mt-1">A descrição é obrigatória (mínimo 3 caracteres).</p>
          }
        </div>

        <!-- Oficina / Prestador -->
        <div>
          <label class="block text-xs font-semibold text-[#8E9DA8] mb-1">Oficina / Prestador de Serviço</label>
          <input
            type="text"
            formControlName="serviceProvider"
            placeholder="Ex: Auto Mecânica Silva & Irmãos"
            class="w-full text-xs bg-[#11161A] border border-[#222A2F] rounded-xl px-3 py-2.5 text-white focus:outline-hidden focus:border-[#FF6B00] transition-all placeholder:text-[#62707C]"
          />
        </div>

        <!-- Iniciar Imediatamente -->
        <div class="p-3.5 bg-[#11161A] rounded-xl border border-[#222A2F] flex flex-col gap-2">
          <div class="flex items-center gap-3">
            <input
              type="checkbox"
              id="sendStartImmediately"
              formControlName="startImmediately"
              [disabled]="isInUse()"
              class="size-4 text-[#FF6B00] accent-[#FF6B00] rounded border-[#222A2F] focus:ring-[#FF6B00] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <label for="sendStartImmediately" class="text-xs text-[#CAD2D9] font-medium cursor-pointer" [class.cursor-not-allowed]="isInUse()">
              Iniciar manutenção imediatamente <span class="text-[#62707C] font-normal">(altera status do veículo para "Em Manutenção")</span>
            </label>
          </div>
          @if (isInUse()) {
            <p class="text-[11px] text-amber-400 flex items-center gap-1.5 pl-7 font-medium">
              <svg lucideAlertTriangle class="size-3.5 shrink-0"></svg>
              <span>Veículo em viagem: só é permitido registrar como agendamento futuro.</span>
            </p>
          }
        </div>

        @if (actionError()) {
          <div class="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
            <svg lucideAlertCircle class="size-4 text-rose-400 shrink-0"></svg>
            <span>{{ actionError() }}</span>
          </div>
        }

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#222A2F]">
          <button
            type="button"
            (click)="onClose()"
            [disabled]="isActionLoading()"
            class="px-4 py-2.5 text-xs font-semibold text-[#8E9DA8] hover:text-white hover:bg-[#171D21] border border-[#222A2F] rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            [disabled]="isActionLoading()"
            class="px-5 py-2.5 text-xs font-bold text-[#080B0C] bg-[#FF6B00] hover:bg-[#E05D00] rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            @if (isActionLoading()) {
              <svg lucideLoader2 class="size-4 animate-spin"></svg>
            }
            Confirmar Manutenção
          </button>
        </div>
      </form>
    </app-modal-shell>
  `
})
export class VehicleSendMaintenanceModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly maintenanceRepository = inject(IMaintenanceRepository);
  private readonly toastService = inject(ToastService);

  isOpen = input<boolean>(false);
  vehicle = input<Vehicle | null>(null);

  readonly getBrandLogo = getVehicleBrandLogo;

  close = output<void>();
  maintenanceSaved = output<void>();

  isActionLoading = signal<boolean>(false);
  actionError = signal<string | null>(null);

  sendMaintenanceForm: FormGroup = this.fb.group({
    type: ['PREVENTIVA', [Validators.required]],
    description: ['', [Validators.required, Validators.minLength(3)]],
    serviceProvider: [''],
    scheduledDate: [''],
    startImmediately: [true]
  });

  constructor() {
    effect(() => {
      const v = this.vehicle();
      if (v && this.isOpen()) {
        this.actionError.set(null);
        this.sendMaintenanceForm.reset({
          type: 'PREVENTIVA',
          description: '',
          serviceProvider: '',
          scheduledDate: '',
          startImmediately: !this.isInUse()
        });
      }
    });
  }

  isInUse(): boolean {
    const v = this.vehicle();
    if (!v) return false;
    return v.status === 'IN_USE' || v.status === 'EM_VIAGEM';
  }

  onClose(): void {
    this.close.emit();
    this.actionError.set(null);
  }

  confirmSendMaintenance(): void {
    const v = this.vehicle();
    if (!v) return;

    if (this.sendMaintenanceForm.invalid) {
      this.sendMaintenanceForm.markAllAsTouched();
      return;
    }

    const formVal = this.sendMaintenanceForm.value;

    if (formVal.startImmediately && this.isInUse()) {
      const msg = 'Não é possível enviar para manutenção imediata: o veículo está em viagem/uso no momento.';
      this.actionError.set(msg);
      this.toastService.warning(msg);
      return;
    }

    this.isActionLoading.set(true);
    this.actionError.set(null);

    if (formVal.startImmediately) {
      this.maintenanceRepository
        .startDirect({
          vehicleId: v.id,
          type: formVal.type,
          description: formVal.description,
          serviceProvider: formVal.serviceProvider || undefined,
          startedAt: new Date().toISOString(),
        })
        .subscribe({
          next: () => {
            this.isActionLoading.set(false);
            this.toastService.success(`Veículo ${v.plate} enviado para manutenção com sucesso!`);
            this.maintenanceSaved.emit();
            this.onClose();
          },
          error: (err) => {
            this.isActionLoading.set(false);
            const msg = err.error?.message || 'Não foi possível enviar o veículo para manutenção.';
            this.actionError.set(msg);
            this.toastService.error(msg);
          },
        });
    } else {
      this.maintenanceRepository
        .create({
          vehicleId: v.id,
          type: formVal.type,
          description: formVal.description,
          serviceProvider: formVal.serviceProvider || undefined,
          scheduledDate: formVal.scheduledDate || undefined,
        })
        .subscribe({
          next: () => {
            this.isActionLoading.set(false);
            this.toastService.success(`Manutenção agendada para o veículo ${v.plate}!`);
            this.maintenanceSaved.emit();
            this.onClose();
          },
          error: (err) => {
            this.isActionLoading.set(false);
            const msg = err.error?.message || 'Não foi possível agendar a manutenção.';
            this.actionError.set(msg);
            this.toastService.error(msg);
          },
        });
    }
  }
}
