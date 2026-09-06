import { Directive, ElementRef, HostListener, inject, Optional } from '@angular/core';
import { NgControl } from '@angular/forms';

/**
 * Diretiva para Máscara de CPF: 000.000.000-00
 */
@Directive({
  selector: '[appCpfMask]',
  standalone: true
})
export class CpfMaskDirective {
  private readonly el = inject(ElementRef);
  private readonly control = inject(NgControl, { optional: true });

  @HostListener('input', ['$event'])
  onInput(event: InputEvent): void {
    const input = this.el.nativeElement as HTMLInputElement;
    let digits = input.value.replace(/\D/g, '').slice(0, 11);

    let formatted = digits;
    if (digits.length > 9) {
      formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
    } else if (digits.length > 6) {
      formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    } else if (digits.length > 3) {
      formatted = `${digits.slice(0, 3)}.${digits.slice(3)}`;
    }

    input.value = formatted;
    if (this.control?.control) {
      this.control.control.setValue(formatted, { emitEvent: false });
    }
  }
}

/**
 * Diretiva para Máscara de Placa Mercosul / Antiga: ABC-1234 ou ABC1D23
 */
@Directive({
  selector: '[appPlateMask]',
  standalone: true
})
export class PlateMaskDirective {
  private readonly el = inject(ElementRef);
  private readonly control = inject(NgControl, { optional: true });

  @HostListener('input', ['$event'])
  onInput(event: InputEvent): void {
    const input = this.el.nativeElement as HTMLInputElement;
    let raw = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);

    input.value = raw;
    if (this.control?.control) {
      this.control.control.setValue(raw, { emitEvent: false });
    }
  }
}

/**
 * Diretiva para Máscara de Telefone: (00) 00000-0000 ou (00) 0000-0000
 */
@Directive({
  selector: '[appPhoneMask]',
  standalone: true
})
export class PhoneMaskDirective {
  private readonly el = inject(ElementRef);
  private readonly control = inject(NgControl, { optional: true });

  @HostListener('input', ['$event'])
  onInput(event: InputEvent): void {
    const input = this.el.nativeElement as HTMLInputElement;
    let digits = input.value.replace(/\D/g, '').slice(0, 11);

    let formatted = digits;
    if (digits.length > 10) {
      // 11 dígitos: (99) 99999-9999
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    } else if (digits.length > 6) {
      // 10 dígitos: (99) 9999-9999
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    } else if (digits.length > 2) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    } else if (digits.length > 0) {
      formatted = `(${digits}`;
    }

    input.value = formatted;
    if (this.control?.control) {
      this.control.control.setValue(formatted, { emitEvent: false });
    }
  }
}

/**
 * Diretiva para Máscara de CNH: 11 dígitos numéricos
 */
@Directive({
  selector: '[appCnhMask]',
  standalone: true
})
export class CnhMaskDirective {
  private readonly el = inject(ElementRef);
  private readonly control = inject(NgControl, { optional: true });

  @HostListener('input', ['$event'])
  onInput(event: InputEvent): void {
    const input = this.el.nativeElement as HTMLInputElement;
    let digits = input.value.replace(/\D/g, '').slice(0, 11);

    input.value = digits;
    if (this.control?.control) {
      this.control.control.setValue(digits, { emitEvent: false });
    }
  }
}

export const INPUT_MASK_DIRECTIVES = [
  CpfMaskDirective,
  PlateMaskDirective,
  PhoneMaskDirective,
  CnhMaskDirective
] as const;
