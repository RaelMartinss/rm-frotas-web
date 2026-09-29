import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { ReportsApiService } from './reports-api.service';
import { environment } from '../../../environments/environment';

describe('ReportsApiService', () => {
  let service: ReportsApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ReportsApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ReportsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve montar corretamente os query params na chamada getCostPerKm', () => {
    service.getCostPerKm({
      from: '2026-09-01',
      to: '2026-09-28',
      vehicleId: 'veh-123',
      page: 2,
      pageSize: 20,
      sort: 'cpk_desc',
    }).subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/reports/cost-per-km`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('from')).toBe('2026-09-01');
    expect(req.request.params.get('to')).toBe('2026-09-28');
    expect(req.request.params.get('vehicleId')).toBe('veh-123');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('20');
    expect(req.request.params.get('sort')).toBe('cpk_desc');

    req.flush({});
  });

  it('deve montar os parâmetros e responseType blob na chamada exportCostPerKm com CSV', () => {
    service.exportCostPerKm({
      from: '2026-09-01',
      to: '2026-09-28',
      vehicleId: 'veh-123',
    }, 'csv').subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/reports/cost-per-km/export`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('from')).toBe('2026-09-01');
    expect(req.request.params.get('to')).toBe('2026-09-28');
    expect(req.request.params.get('format')).toBe('csv');
    expect(req.request.responseType).toBe('blob');

    req.flush(new Blob(['test']));
  });

  it('deve montar os parâmetros e responseType blob na chamada exportCostPerKm com PDF', () => {
    service.exportCostPerKm({
      from: '2026-09-01',
      to: '2026-09-28',
    }, 'pdf').subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/reports/cost-per-km/export`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('from')).toBe('2026-09-01');
    expect(req.request.params.get('to')).toBe('2026-09-28');
    expect(req.request.params.get('format')).toBe('pdf');
    expect(req.request.responseType).toBe('blob');

    req.flush(new Blob(['%PDF-1.4']));
  });

  it('deve fazer download do blob via elemento <a> temporário', () => {
    const createObjectURLSpy = vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const revokeObjectURLSpy = vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});

    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    } as unknown as HTMLAnchorElement;

    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor);
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor);

    const blob = new Blob(['col1;col2'], { type: 'text/csv' });
    service.downloadBlob(blob, 'relatorio.csv');

    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
    expect(mockAnchor.download).toBe('relatorio.csv');
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');

    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });
});
