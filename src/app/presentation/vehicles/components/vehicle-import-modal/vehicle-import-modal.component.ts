import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IVehicleRepository } from '../../../../domain/repositories/vehicle.repository.interface';
import { ToastService } from '../../../../core/services/toast.service';
import { VehicleImportResult } from '../../../../domain/models/vehicle.model';
import { ModalShellComponent } from '../../../shared/components/modal-shell/modal-shell.component';
import {
  LucideFileText,
  LucideLoader2,
  LucideAlertCircle,
  LucideAlertTriangle,
  LucideCheck,
  LucideX
} from '@lucide/angular';

@Component({
  selector: 'app-vehicle-import-modal',
  standalone: true,
  imports: [
    CommonModule,
    ModalShellComponent,
    LucideFileText,
    LucideLoader2,
    LucideAlertCircle,
    LucideAlertTriangle,
    LucideCheck,
    LucideX
  ],
  template: `
    <app-modal-shell
      [isOpen]="isOpen()"
      title="Importação em Lote de Veículos"
      subtitle="Suba uma planilha CSV para cadastrar múltiplos veículos de uma só vez."
      maxWidth="2xl"
      (close)="onClose()"
    >
      <div header-icon class="size-7 rounded-lg bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center border border-[#FF6B00]/20 shadow-2xs">
        <svg lucideFileText class="size-4"></svg>
      </div>

      <!-- Corpo do Modal com Scroll -->
      <div class="p-6 space-y-5">
        <!-- Banner de Download do Modelo -->
        <div class="p-4 rounded-xl bg-[#11161A] border border-[#222A2F] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div class="flex items-start gap-3">
            <div class="size-8 rounded-lg bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center shrink-0 mt-0.5 border border-[#FF6B00]/20">
              <svg lucideFileText class="size-4.5"></svg>
            </div>
            <div>
              <h3 class="text-xs font-bold text-white">Planilha Modelo Padronizada</h3>
              <p class="text-[11px] text-[#8E9DA8] mt-0.5 leading-relaxed">
                Utilize nosso modelo com cabeçalhos (<code class="bg-[#0B0E11] text-white px-1 py-0.5 rounded border border-[#222A2F] font-mono text-[10px]">placa, marca, modelo, ano, km, vencimento_crlv</code>).
              </p>
            </div>
          </div>
          <button
            type="button"
            (click)="downloadTemplateCsv()"
            class="inline-flex items-center gap-1.5 px-3 py-2 bg-[#171D21] hover:bg-[#222A2F] text-white text-xs font-semibold rounded-lg border border-[#222A2F] shadow-2xs transition-colors shrink-0 cursor-pointer"
          >
            <svg class="size-3.5 text-[#FF6B00]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Baixar Modelo CSV</span>
          </button>
        </div>

        <!-- Se ainda não tem resultado de importação, exibe área de upload -->
        @if (!importResult()) {
          <!-- Dropzone de Arquivo -->
          <div
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onFileDropped($event)"
            class="border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer relative"
            [ngClass]="isDragging() ? 'border-[#FF6B00] bg-[#FF6B00]/10' : 'border-[#222A2F] hover:border-[#35414B] bg-[#11161A]'"
          >
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              (change)="onFileSelected($event)"
              class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div class="flex flex-col items-center">
              <div class="size-12 rounded-full bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center mb-3 border border-[#FF6B00]/20">
                <svg class="size-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p class="text-xs font-bold text-white">
                Arraste seu arquivo CSV aqui ou <span class="text-[#FF6B00] hover:underline">clique para selecionar</span>
              </p>
              <p class="text-[11px] text-[#8E9DA8] mt-1">
                Suporta formato CSV (UTF-8 ou Windows Excel) até 5MB
              </p>
            </div>
          </div>

          <!-- Arquivo Selecionado -->
          @if (selectedFile()) {
            <div class="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="size-8 rounded-lg bg-emerald-500 text-[#080B0C] flex items-center justify-center shrink-0">
                  <svg lucideFileText class="size-4"></svg>
                </div>
                <div>
                  <div class="text-xs font-bold text-white">{{ selectedFile()!.name }}</div>
                  <div class="text-[10px] text-[#8E9DA8]">{{ formatFileSize(selectedFile()!.size) }}</div>
                </div>
              </div>
              <button
                type="button"
                (click)="removeSelectedFile()"
                class="p-1 text-[#8E9DA8] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                title="Remover arquivo"
              >
                <svg lucideX class="size-4"></svg>
              </button>
            </div>
          }

          <!-- Mensagem de Erro Geral -->
          @if (importErrorMessage()) {
            <div class="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-start gap-2.5">
              <svg lucideAlertCircle class="size-4 shrink-0 mt-0.5 text-rose-400"></svg>
              <span>{{ importErrorMessage() }}</span>
            </div>
          }
        } @else {
          <!-- RELATÓRIO DO RESULTADO DA IMPORTAÇÃO -->
          <div class="space-y-4">
            <!-- Cards de Métricas -->
            <div class="grid grid-cols-3 gap-3">
              <div class="p-3.5 bg-[#11161A] border border-[#222A2F] rounded-xl text-center">
                <div class="text-[11px] font-medium text-[#8E9DA8]">Total no Arquivo</div>
                <div class="text-lg font-bold text-white mt-0.5">{{ importResult()!.totalLinhas }}</div>
              </div>
              <div class="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                <div class="text-[11px] font-medium text-emerald-400">Importados com Sucesso</div>
                <div class="text-lg font-bold text-emerald-400 mt-0.5">{{ importResult()!.importadosComSucesso }}</div>
              </div>
              <div class="p-3.5 border rounded-xl text-center"
                [ngClass]="importResult()!.erros.length > 0 ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-[#11161A] border-[#222A2F] text-[#8E9DA8]'"
              >
                <div class="text-[11px] font-medium">Rejeitados / Erros</div>
                <div class="text-lg font-bold mt-0.5">{{ importResult()!.erros.length }}</div>
              </div>
            </div>

            <!-- Tabela de Linhas Rejeitadas (se houver erros) -->
            @if (importResult()!.erros.length > 0) {
              <div class="border border-rose-500/20 rounded-xl overflow-hidden">
                <div class="px-4 py-2.5 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between">
                  <span class="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <svg lucideAlertTriangle class="size-3.5 text-rose-400"></svg>
                    Linhas com inconsistência ({{ importResult()!.erros.length }})
                  </span>
                </div>
                <div class="max-h-60 overflow-y-auto">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-[#0B0E11] text-[#8E9DA8] text-[10px] uppercase tracking-wider sticky top-0 border-b border-[#222A2F]">
                      <tr>
                        <th class="py-2 px-3 font-semibold w-16">Linha</th>
                        <th class="py-2 px-3 font-semibold w-24">Placa</th>
                        <th class="py-2 px-3 font-semibold">Motivo da Rejeição</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-[#222A2F]">
                      @for (err of importResult()!.erros; track err.linha) {
                        <tr class="hover:bg-[#171D21]">
                          <td class="py-2 px-3 font-mono font-bold text-white">#{{ err.linha }}</td>
                          <td class="py-2 px-3 font-mono text-[#CAD2D9] font-semibold">{{ err.placa || '-' }}</td>
                          <td class="py-2 px-3 text-rose-400 font-medium">{{ err.motivo }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            } @else {
              <div class="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                <div class="size-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                  <svg lucideCheck class="size-5"></svg>
                </div>
                <div class="text-xs font-bold text-emerald-400">Todos os veículos foram importados com sucesso!</div>
                <div class="text-[11px] text-emerald-500 mt-0.5">Nenhuma linha apresentou erro.</div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Rodapé do Modal -->
      <div footer class="px-6 py-4 border-t border-[#222A2F] flex items-center justify-between bg-[#0B0E11]">
        @if (!importResult()) {
          <button
            type="button"
            (click)="onClose()"
            [disabled]="isImporting()"
            class="px-4 py-2 text-xs font-semibold text-[#8E9DA8] hover:text-white hover:bg-[#171D21] border border-[#222A2F] rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            (click)="executeImport()"
            [disabled]="!selectedFile() || isImporting()"
            class="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#E05D00] disabled:opacity-50 text-[#080B0C] font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            @if (isImporting()) {
              <svg lucideLoader2 class="size-4 animate-spin"></svg>
              <span>Processando e Validando...</span>
            } @else {
              <span>Importar Veículos</span>
            }
          </button>
        } @else {
          <button
            type="button"
            (click)="resetImport()"
            class="px-4 py-2 text-xs font-semibold text-[#8E9DA8] hover:text-white hover:bg-[#171D21] border border-[#222A2F] rounded-xl transition-colors cursor-pointer"
          >
            Importar Outro Arquivo
          </button>
          <button
            type="button"
            (click)="onClose()"
            class="px-5 py-2.5 bg-[#FF6B00] hover:bg-[#E05D00] text-[#080B0C] font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Concluir e Ver Frota
          </button>
        }
      </div>
    </app-modal-shell>
  `
})
export class VehicleImportModalComponent {
  private readonly vehicleRepository = inject(IVehicleRepository);
  private readonly toastService = inject(ToastService);

  isOpen = input<boolean>(false);

  close = output<void>();
  importCompleted = output<VehicleImportResult>();

  isImporting = signal<boolean>(false);
  selectedFile = signal<File | null>(null);
  importResult = signal<VehicleImportResult | null>(null);
  importErrorMessage = signal<string | null>(null);
  isDragging = signal<boolean>(false);

  onClose(): void {
    this.close.emit();
    this.selectedFile.set(null);
    this.importResult.set(null);
    this.importErrorMessage.set(null);
  }

  resetImport(): void {
    this.selectedFile.set(null);
    this.importResult.set(null);
    this.importErrorMessage.set(null);
  }

  downloadTemplateCsv(): void {
    const csvContent =
      'placa,marca,modelo,ano,km,vencimento_crlv\r\n' +
      'ABC1D23,Volvo,FH 540,2023,15000,31/12/2026\r\n' +
      'XYZ9876,Scania,R450,2022,45000,15/10/2026\r\n' +
      'BRA2E19,Mercedes-Benz,Actros 2651,2024,8000,\r\n' +
      'KLD9012,DAF,XF 530,2021,95000,20/08/2026\r\n';

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo-importacao-veiculos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.toastService.success('Planilha modelo (.csv) baixada com sucesso!');
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onFileDropped(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.processFile(event.dataTransfer.files[0]);
    }
  }

  processFile(file: File): void {
    this.importErrorMessage.set(null);
    this.importResult.set(null);

    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.importErrorMessage.set('Por favor, selecione um arquivo válido com extensão .csv.');
      this.toastService.error('Formato inválido! Envie um arquivo .csv.');
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      this.importErrorMessage.set('O arquivo selecionado excede o limite máximo permitido de 5MB.');
      this.toastService.error('Arquivo muito grande! Máximo de 5MB.');
      return;
    }

    this.selectedFile.set(file);
  }

  removeSelectedFile(): void {
    this.selectedFile.set(null);
    this.importResult.set(null);
    this.importErrorMessage.set(null);
  }

  executeImport(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.isImporting.set(true);
    this.importErrorMessage.set(null);
    this.importResult.set(null);

    this.vehicleRepository.importCsv(file).subscribe({
      next: (result) => {
        this.isImporting.set(false);
        this.importResult.set(result);

        if (result.importadosComSucesso > 0 && result.erros.length === 0) {
          this.toastService.success(`Sucesso! ${result.importadosComSucesso} veículos foram importados.`);
        } else if (result.importadosComSucesso > 0 && result.erros.length > 0) {
          this.toastService.warning(
            `${result.importadosComSucesso} veículos importados com sucesso, mas ${result.erros.length} linha(s) tiveram problemas.`
          );
        } else {
          this.toastService.error('Nenhum veículo foi importado. Verifique os erros apontados no relatório.');
        }

        if (result.importadosComSucesso > 0) {
          this.importCompleted.emit(result);
        }
      },
      error: (err) => {
        this.isImporting.set(false);
        const msg =
          err.error?.message ||
          'Ocorreu um erro ao processar o arquivo CSV. Verifique a estrutura das colunas e tente novamente.';
        this.importErrorMessage.set(msg);
        this.toastService.error(msg);
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
}
