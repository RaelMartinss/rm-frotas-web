export interface VehicleBrandOption {
  name: string;
  slug: string;
  logoUrl: string;
  category: 'car' | 'truck' | 'both';
}

export const POPULAR_VEHICLE_BRANDS: VehicleBrandOption[] = [
  { name: 'Chevrolet', slug: 'chevrolet', logoUrl: 'images/brands/chevrolet.svg', category: 'car' },
  { name: 'Volkswagen', slug: 'volkswagen', logoUrl: 'images/brands/volkswagen.svg', category: 'both' },
  { name: 'Fiat', slug: 'fiat', logoUrl: 'images/brands/fiat.svg', category: 'car' },
  { name: 'Toyota', slug: 'toyota', logoUrl: 'images/brands/toyota.svg', category: 'car' },
  { name: 'Ford', slug: 'ford', logoUrl: 'images/brands/ford.svg', category: 'both' },
  { name: 'Scania', slug: 'scania', logoUrl: 'images/brands/scania.svg', category: 'truck' },
  { name: 'Volvo', slug: 'volvo', logoUrl: 'images/brands/volvo.svg', category: 'both' },
  { name: 'Mercedes-Benz', slug: 'mercedes', logoUrl: 'images/brands/mercedes.svg', category: 'both' },
  { name: 'Hyundai', slug: 'hyundai', logoUrl: 'images/brands/hyundai.svg', category: 'car' },
  { name: 'Renault', slug: 'renault', logoUrl: 'images/brands/renault.svg', category: 'car' },
  { name: 'Honda', slug: 'honda', logoUrl: 'images/brands/honda.svg', category: 'car' },
  { name: 'Iveco', slug: 'iveco', logoUrl: 'images/brands/iveco.svg', category: 'truck' },
  { name: 'DAF', slug: 'daf', logoUrl: 'images/brands/daf.svg', category: 'truck' },
  { name: 'MAN', slug: 'man', logoUrl: 'images/brands/man.svg', category: 'truck' },
  { name: 'Nissan', slug: 'nissan', logoUrl: 'images/brands/nissan.svg', category: 'car' },
  { name: 'Jeep', slug: 'jeep', logoUrl: 'images/brands/jeep.svg', category: 'car' },
  { name: 'RAM', slug: 'ram', logoUrl: 'images/brands/ram.svg', category: 'car' },
  { name: 'BYD', slug: 'byd', logoUrl: 'images/brands/byd.svg', category: 'car' },
  { name: 'Kia', slug: 'kia', logoUrl: 'images/brands/kia.svg', category: 'car' },
  { name: 'Peugeot', slug: 'peugeot', logoUrl: 'images/brands/peugeot.svg', category: 'car' },
  { name: 'Citroën', slug: 'citroen', logoUrl: 'images/brands/citroen.svg', category: 'car' },
  { name: 'Mitsubishi', slug: 'mitsubishi', logoUrl: 'images/brands/mitsubishi.svg', category: 'car' },
  { name: 'BMW', slug: 'bmw', logoUrl: 'images/brands/bmw.svg', category: 'car' },
  { name: 'Audi', slug: 'audi', logoUrl: 'images/brands/audi.svg', category: 'car' },
];

const BRAND_ALIASES: Record<string, string> = {
  // Chevrolet / GM
  chevrolet: 'chevrolet',
  chevy: 'chevrolet',
  gm: 'chevrolet',
  'general motors': 'chevrolet',

  // Volkswagen
  volkswagen: 'volkswagen',
  vw: 'volkswagen',
  volks: 'volkswagen',

  // Fiat
  fiat: 'fiat',

  // Toyota
  toyota: 'toyota',

  // Scania
  scania: 'scania',

  // Volvo
  volvo: 'volvo',

  // Ford
  ford: 'ford',

  // Mercedes-Benz
  'mercedes-benz': 'mercedes',
  'mercedes benz': 'mercedes',
  mercedes: 'mercedes',
  mb: 'mercedes',

  // Hyundai
  hyundai: 'hyundai',

  // Renault
  renault: 'renault',

  // Honda
  honda: 'honda',

  // Iveco
  iveco: 'iveco',

  // DAF
  daf: 'daf',

  // MAN
  man: 'man',

  // Nissan
  nissan: 'nissan',

  // Jeep
  jeep: 'jeep',

  // RAM
  ram: 'ram',
  dodge: 'ram',

  // BYD
  byd: 'byd',

  // Kia
  kia: 'kia',

  // Peugeot
  peugeot: 'peugeot',

  // Citroën
  citroen: 'citroen',
  'citroën': 'citroen',

  // Mitsubishi
  mitsubishi: 'mitsubishi',

  // BMW
  bmw: 'bmw',

  // Audi
  audi: 'audi',
};

/**
 * Normaliza uma string de marca para identificar o slug correspondente.
 */
export function normalizeBrandSlug(brand?: string | null): string | null {
  if (!brand) return null;

  const clean = brand
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  // Verifica correspondência exata nos aliases
  if (BRAND_ALIASES[clean]) {
    return BRAND_ALIASES[clean];
  }

  // Verifica se alguma chave conhecida está contida no nome (ex: "Chevrolet Brasil" -> "chevrolet")
  for (const [alias, slug] of Object.entries(BRAND_ALIASES)) {
    if (clean.includes(alias) || alias.includes(clean)) {
      return slug;
    }
  }

  return null;
}

/**
 * Retorna o caminho do logo SVG da marca, ou null se não for reconhecida.
 */
export function getVehicleBrandLogo(brand?: string | null): string | null {
  const slug = normalizeBrandSlug(brand);
  return slug ? `images/brands/${slug}.svg` : null;
}
