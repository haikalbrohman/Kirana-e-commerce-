import { parseQueryRules } from './rules.js';

const categories = ['fashion-wanita', 'fashion-pria', 'sepatu', 'tas-aksesoris', 'elektronik', 'kecantikan', 'rumah-dapur', 'makanan-minuman'].map((slug) => ({ slug, name: slug }));
const parse = (q: string) => parseQueryRules(q, categories);

describe('parseQueryRules (pencarian bahasa sehari-hari)', () => {
  it('sepatu lari di bawah Rp500.000', () => {
    const f = parse('Carikan sepatu lari di bawah Rp500.000');
    expect(f).toMatchObject({ category: 'sepatu', maxPrice: 500000 });
    expect(f.keywords).toEqual(['sepatu', 'lari']);
  });

  it('tas kerja hitam muat laptop 14 inci di bawah Rp400.000', () => {
    const f = parse('Saya ingin tas kerja hitam yang muat laptop 14 inci, terlihat profesional, dan harganya di bawah Rp400.000');
    expect(f).toMatchObject({ category: 'tas-aksesoris', maxPrice: 400000 });
    expect(f.keywords).toEqual(expect.arrayContaining(['tas', 'kerja', 'hitam', 'laptop']));
    expect(f.keywords.some((k) => /\d|rp/.test(k))).toBe(false);
  });

  it('laptop mahasiswa budget Rp7 juta', () => {
    const f = parse('Laptop apa yang cocok untuk mahasiswa dengan budget Rp7 juta?');
    expect(f).toMatchObject({ category: 'elektronik', maxPrice: 7_000_000 });
    expect(f.keywords).toEqual(['laptop', 'mahasiswa']);
  });

  it('rentang harga & singkatan rb/jt', () => {
    expect(parse('kemeja 100rb-250rb')).toMatchObject({ minPrice: 100000, maxPrice: 250000 });
    expect(parse('hp maks 2,5jt')).toMatchObject({ maxPrice: 2_500_000 });
  });

  it('kualitas bagus tapi terjangkau -> urutkan rating, tanpa kata kunci sampah', () => {
    const f = parse('Carikan produk dengan kualitas bagus tetapi harganya terjangkau');
    expect(f.sort).toBe('rating');
    expect(f.keywords).toEqual([]);
  });
});
