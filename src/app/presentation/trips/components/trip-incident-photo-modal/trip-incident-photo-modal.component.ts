import { Component, input, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { LucideCamera, LucideX, LucidePhone, LucideExternalLink } from '@lucide/angular';
import { Incident } from '../../../../domain/models/incident.model';

@Component({
  selector: 'app-trip-incident-photo-modal',
  standalone: true,
  imports: [CommonModule, DatePipe, LucideCamera, LucideX, LucidePhone, LucideExternalLink],
  template: `
    @if (photoUrl(); as photo) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
          <div class="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div>
              <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
                <svg lucideCamera class="size-4 text-rose-600"></svg>
                Evidência Fotográfica da Avaria
                @if (incident()?.protocol; as prot) {
                  <span class="font-mono text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">{{ prot }}</span>
                }
              </h3>
              <p class="text-[11px] text-slate-500">
                Enviado por {{ incident()?.driverName || 'Condutor' }} em {{ incident()?.createdAt | date:'dd/MM/yyyy HH:mm' }}
              </p>
            </div>
            <button
              type="button"
              (click)="close.emit()"
              class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer transition-colors"
            >
              <svg lucideX class="size-5"></svg>
            </button>
          </div>

          <div class="p-4 overflow-auto flex-1 flex items-center justify-center bg-slate-950/90 min-h-[300px]">
            <img [src]="photo" alt="Evidência da avaria" class="max-w-full max-h-[65vh] object-contain rounded-lg shadow-lg" />
          </div>

          @if (incident(); as inc) {
            <div class="p-4 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
              <div class="flex flex-wrap items-center gap-3">
                <span><strong>Tipo:</strong> {{ inc.category }}</span>
                @if (inc.vehiclePlate) {
                  <span><strong>Placa:</strong> <span class="font-mono font-bold">{{ inc.vehiclePlate }}</span></span>
                }
                @if (inc.driverPhone) {
                  <a [href]="'tel:' + inc.driverPhone" class="text-emerald-700 hover:underline flex items-center gap-1 font-medium">
                    <svg lucidePhone class="size-3"></svg> {{ inc.driverPhone }}
                  </a>
                }
                @if (inc.latitude && inc.longitude) {
                  <a [href]="'https://www.google.com/maps?q=' + inc.latitude + ',' + inc.longitude" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline flex items-center gap-1 font-medium">
                    <svg lucideExternalLink class="size-3.5"></svg> Ver Local no GPS
                  </a>
                }
              </div>
              <button (click)="close.emit()" class="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer">
                Fechar
              </button>
            </div>
          }
        </div>
      </div>
    }
  `
})
export class TripIncidentPhotoModalComponent {
  readonly photoUrl = input<string | null>(null);
  readonly incident = input<Incident | null>(null);

  readonly close = output<void>();
}
