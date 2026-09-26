import { Component, effect, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucideUsers,
  LucideX,
  LucideAlertCircle,
  LucideMail,
  LucideLoader2
} from '@lucide/angular';
import {
  CpfMaskDirective,
  PhoneMaskDirective,
  CnhMaskDirective
} from '../../../shared/directives/input-mask.directives';

export interface DriverFormPayload {
  name: string;
  email: string;
  cpf: string;
  phone?: string;
  cnhNumber: string;
  cnhCategory: string;
  cnhExpiration: string;
}

@Component({
  selector: 'app-driver-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CpfMaskDirective,
    PhoneMaskDirective,
    CnhMaskDirective,
    LucideUsers,
    LucideX,
    LucideAlertCircle,
    LucideMail,
    LucideLoader2
  ],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">
                <div class="size-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
                  <svg lucideUsers class="size-4"></svg>
                </div>
                Cadastrar Novo Motorista
              </h2>
              <p class="text-[11px] text-slate-400 mt-0.5 ml-9">Informe os dados pessoais e habilitação para alocação em viagens.</p>
            </div>
            <button (click)="close.emit()" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer">
              <svg lucideX class="size-5"></svg>
            </button>
          </div>

          <form [formGroup]="driverForm" (ngSubmit)="onSubmit()" class="p-6 space-y-4">
            @if (errorMessage()) {
              <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-800 text-xs">
                <svg lucideAlertCircle class="size-4 text-rose-600 shrink-0 mt-0.5"></svg>
                <div class="flex-1">
                  <span class="font-semibold">Erro no cadastro:</span> {{ errorMessage() }}
                </div>
              </div>
            }

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                Nome Completo do Condutor <span class="text-rose-500">*</span>
              </label>
              <input
                type="text"
                formControlName="name"
                placeholder="Ex: João da Silva Santos"
                class="w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                [class.border-rose-400]="driverForm.get('name')?.invalid && driverForm.get('name')?.touched"
                [class.bg-rose-50/50]="driverForm.get('name')?.invalid && driverForm.get('name')?.touched"
                [class.border-slate-200]="!(driverForm.get('name')?.invalid && driverForm.get('name')?.touched)"
              />
              @if (driverForm.get('name')?.touched && driverForm.get('name')?.errors?.['required']) {
                <p class="text-[10px] text-rose-500 mt-1 font-medium">Campo obrigatório.</p>
              }
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                E-mail de Acesso ao Aplicativo <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <input
                  type="email"
                  formControlName="email"
                  placeholder="motorista@empresa.com"
                  class="w-full bg-slate-50 border rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                  [class.border-rose-400]="driverForm.get('email')?.invalid && driverForm.get('email')?.touched"
                  [class.bg-rose-50/50]="driverForm.get('email')?.invalid && driverForm.get('email')?.touched"
                  [class.border-slate-200]="!(driverForm.get('email')?.invalid && driverForm.get('email')?.touched)"
                />
                <svg lucideMail class="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></svg>
              </div>
              @if (driverForm.get('email')?.touched && driverForm.get('email')?.errors?.['required']) {
                <p class="text-[10px] text-rose-500 mt-1 font-medium">O e-mail é obrigatório para o login do motorista.</p>
              } @else if (driverForm.get('email')?.touched && driverForm.get('email')?.errors?.['email']) {
                <p class="text-[10px] text-rose-500 mt-1 font-medium">Insira um endereço de e-mail válido.</p>
              }
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  CPF <span class="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  appCpfMask
                  formControlName="cpf"
                  placeholder="000.000.000-00"
                  class="w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:font-sans placeholder:text-slate-400"
                  [class.border-rose-400]="driverForm.get('cpf')?.invalid && driverForm.get('cpf')?.touched"
                  [class.bg-rose-50/50]="driverForm.get('cpf')?.invalid && driverForm.get('cpf')?.touched"
                  [class.border-slate-200]="!(driverForm.get('cpf')?.invalid && driverForm.get('cpf')?.touched)"
                />
                @if (driverForm.get('cpf')?.touched && driverForm.get('cpf')?.errors?.['required']) {
                  <p class="text-[10px] text-rose-500 mt-1 font-medium">Campo obrigatório.</p>
                } @else if (driverForm.get('cpf')?.touched && driverForm.get('cpf')?.errors?.['pattern']) {
                  <p class="text-[10px] text-rose-500 mt-1 font-medium">CPF inválido. Use 11 dígitos ou formato 000.000.000-00.</p>
                }
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  appPhoneMask
                  formControlName="phone"
                  placeholder="(00) 00000-0000"
                  class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div class="col-span-2">
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Número de Registro da CNH <span class="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  appCnhMask
                  formControlName="cnhNumber"
                  placeholder="12345678900"
                  class="w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:font-sans placeholder:text-slate-400"
                  [class.border-rose-400]="driverForm.get('cnhNumber')?.invalid && driverForm.get('cnhNumber')?.touched"
                  [class.bg-rose-50/50]="driverForm.get('cnhNumber')?.invalid && driverForm.get('cnhNumber')?.touched"
                  [class.border-slate-200]="!(driverForm.get('cnhNumber')?.invalid && driverForm.get('cnhNumber')?.touched)"
                />
                @if (driverForm.get('cnhNumber')?.touched && driverForm.get('cnhNumber')?.errors?.['required']) {
                  <p class="text-[10px] text-rose-500 mt-1 font-medium">Campo obrigatório.</p>
                } @else if (driverForm.get('cnhNumber')?.touched && driverForm.get('cnhNumber')?.errors?.['pattern']) {
                  <p class="text-[10px] text-rose-500 mt-1 font-medium">A CNH deve conter 11 dígitos numéricos.</p>
                }
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Categoria <span class="text-rose-500">*</span>
                </label>
                <select
                  formControlName="cnhCategory"
                  class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                >
                  @for (cat of cnhCategories(); track cat) {
                    <option [value]="cat">Cat. {{ cat }}</option>
                  }
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                Data de Validade da CNH <span class="text-rose-500">*</span>
              </label>
              <input
                type="date"
                formControlName="cnhExpiration"
                class="w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                [class.border-rose-400]="driverForm.get('cnhExpiration')?.invalid && driverForm.get('cnhExpiration')?.touched"
                [class.bg-rose-50/50]="driverForm.get('cnhExpiration')?.invalid && driverForm.get('cnhExpiration')?.touched"
                [class.border-slate-200]="!(driverForm.get('cnhExpiration')?.invalid && driverForm.get('cnhExpiration')?.touched)"
              />
              @if (driverForm.get('cnhExpiration')?.touched && driverForm.get('cnhExpiration')?.errors?.['required']) {
                <p class="text-[10px] text-rose-500 mt-1 font-medium">Campo obrigatório.</p>
              }
            </div>

            <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                (click)="close.emit()"
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
                Salvar Motorista
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `
})
export class DriverFormModalComponent {
  private readonly fb = inject(FormBuilder);

  readonly isOpen = input<boolean>(false);
  readonly isSaving = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);
  readonly cnhCategories = input<string[]>(['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE']);

  readonly close = output<void>();
  readonly save = output<DriverFormPayload>();

  driverForm: FormGroup = this.buildForm();

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.driverForm.reset({
          name: '',
          email: '',
          cpf: '',
          phone: '',
          cnhNumber: '',
          cnhCategory: 'B',
          cnhExpiration: ''
        });
      }
    });
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      cpf: ['', [Validators.required, Validators.pattern(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/)]],
      phone: [''],
      cnhNumber: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
      cnhCategory: ['B', Validators.required],
      cnhExpiration: ['', Validators.required],
    });
  }

  onSubmit(): void {
    if (this.driverForm.invalid) {
      this.driverForm.markAllAsTouched();
      return;
    }
    this.save.emit(this.driverForm.value);
  }
}
