import { describe, it, expect } from 'vitest';
import { getVehicleBrandLogo, normalizeBrandSlug } from './vehicle-brand.util';

describe('vehicle-brand.util', () => {
  it('should resolve Chevrolet from various forms', () => {
    expect(normalizeBrandSlug('Chevrolet')).toBe('chevrolet');
    expect(normalizeBrandSlug('CHEVROLET')).toBe('chevrolet');
    expect(normalizeBrandSlug('GM')).toBe('chevrolet');
    expect(getVehicleBrandLogo('CHEVROLET TRACKER')).toBe('images/brands/chevrolet.svg');
  });

  it('should resolve Volkswagen and VW', () => {
    expect(normalizeBrandSlug('Volkswagen')).toBe('volkswagen');
    expect(normalizeBrandSlug('VW')).toBe('volkswagen');
    expect(getVehicleBrandLogo('Volkswagen Saveiro')).toBe('images/brands/volkswagen.svg');
  });

  it('should resolve Fiat', () => {
    expect(normalizeBrandSlug('Fiat')).toBe('fiat');
    expect(getVehicleBrandLogo('Fiat Strada')).toBe('images/brands/fiat.svg');
  });

  it('should resolve Scania and Volvo', () => {
    expect(getVehicleBrandLogo('Scania')).toBe('images/brands/scania.svg');
    expect(getVehicleBrandLogo('Volvo FH540')).toBe('images/brands/volvo.svg');
  });

  it('should resolve Mercedes-Benz', () => {
    expect(getVehicleBrandLogo('Mercedes-Benz')).toBe('images/brands/mercedes.svg');
    expect(getVehicleBrandLogo('Mercedes')).toBe('images/brands/mercedes.svg');
  });

  it('should return null for unknown brand', () => {
    expect(getVehicleBrandLogo('')).toBeNull();
    expect(getVehicleBrandLogo(null)).toBeNull();
    expect(getVehicleBrandLogo('MarcaInexistente123')).toBeNull();
  });
});
