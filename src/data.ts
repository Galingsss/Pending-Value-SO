/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SORecord {
  tanggal: string;
  kategori: string;
  kriteria: string;
  count: number;
  value: number;
}

export type SortField = 'tanggal' | 'kategori' | 'kriteria' | 'count' | 'value';
export type SortOrder = 'asc' | 'desc';

export const FALLBACK_CSV_DATA: SORecord[] = [
  { tanggal: '05 Jun 2026', kategori: '1P', kriteria: 'HIGH', count: 12, value: 112310552 },
  { tanggal: '05 Jun 2026', kategori: '1P', kriteria: 'LOW', count: 5, value: 15128869 },
  { tanggal: '05 Jun 2026', kategori: '1P', kriteria: 'MEDIUM', count: 57, value: 279526364 },
  { tanggal: '08 Jun 2026', kategori: '1P', kriteria: 'LOW', count: 5, value: 5674933 },
  { tanggal: '08 Jun 2026', kategori: '1P', kriteria: 'MEDIUM', count: 12, value: 53375064 },
  { tanggal: '09 Jun 2026', kategori: '1P', kriteria: 'LOW', count: 4, value: 7653213 },
  { tanggal: '09 Jun 2026', kategori: '1P', kriteria: 'MEDIUM', count: 3, value: 12591827 },
  { tanggal: '11 Jun 2026', kategori: '1P', kriteria: 'LOW', count: 1, value: 302250 },
  { tanggal: '11 Jun 2026', kategori: '1P', kriteria: 'MEDIUM', count: 1, value: 1794852 },
  { tanggal: '12 Jun 2026', kategori: '1P', kriteria: 'HIGH', count: 8, value: 83102457 },
  { tanggal: '12 Jun 2026', kategori: '1P', kriteria: 'LOW', count: 7, value: 26351433 },
  { tanggal: '12 Jun 2026', kategori: '1P', kriteria: 'MEDIUM', count: 23, value: 142044729 },
  { tanggal: '15 Jun 2026', kategori: '1P', kriteria: 'ADVANCE', count: 14, value: 377099215 },
  { tanggal: '15 Jun 2026', kategori: '1P', kriteria: 'HIGH', count: 58, value: 887570183 },
  { tanggal: '15 Jun 2026', kategori: '1P', kriteria: 'LOW', count: 34, value: 34273227 },
  { tanggal: '15 Jun 2026', kategori: '1P', kriteria: 'MEDIUM', count: 33, value: 201083511 },
  { tanggal: '15 Jun 2026', kategori: '2P', kriteria: 'HIGH', count: 1, value: 7310225 },
  { tanggal: '15 Jun 2026', kategori: '2P', kriteria: 'LOW', count: 2, value: 8049828 },
  { tanggal: '15 Jun 2026', kategori: '2P', kriteria: 'MEDIUM', count: 18, value: 70096211 },
  { tanggal: '17 Jun 2026', kategori: '1P', kriteria: 'ADVANCE', count: 20, value: 1208155793 },
  { tanggal: '17 Jun 2026', kategori: '1P', kriteria: 'HIGH', count: 76, value: 1219007832 },
  { tanggal: '17 Jun 2026', kategori: '1P', kriteria: 'LOW', count: 39, value: 25494892 },
  { tanggal: '17 Jun 2026', kategori: '1P', kriteria: 'MEDIUM', count: 36, value: 190073103 },
  { tanggal: '17 Jun 2026', kategori: '2P', kriteria: 'HIGH', count: 2, value: 11976613 },
  { tanggal: '17 Jun 2026', kategori: '2P', kriteria: 'LOW', count: 52, value: 61249774 },
  { tanggal: '17 Jun 2026', kategori: '2P', kriteria: 'MEDIUM', count: 48, value: 162885916 },
  { tanggal: '18 Jun 2026', kategori: '1P', kriteria: 'ADVANCE', count: 27, value: 1054326127 },
  { tanggal: '18 Jun 2026', kategori: '1P', kriteria: 'HIGH', count: 117, value: 1597338892 },
  { tanggal: '18 Jun 2026', kategori: '1P', kriteria: 'LOW', count: 57, value: 73259368 },
  { tanggal: '18 Jun 2026', kategori: '1P', kriteria: 'MEDIUM', count: 117, value: 694849273 },
  { tanggal: '18 Jun 2026', kategori: '2P', kriteria: 'HIGH', count: 5, value: 23067878 },
  { tanggal: '18 Jun 2026', kategori: '2P', kriteria: 'LOW', count: 27, value: 37905859 },
  { tanggal: '18 Jun 2026', kategori: '2P', kriteria: 'MEDIUM', count: 17, value: 60880597 },
  { tanggal: '18 Jun 2026', kategori: '3P', kriteria: 'LOW', count: 14, value: 6872991 },
  { tanggal: '18 Jun 2026', kategori: '3P', kriteria: 'MEDIUM', count: 4, value: 4944770 }
];

export function parseCSV(csvText: string): SORecord[] {
  const lines = csvText.split(/\r?\n/);
  const records: SORecord[] = [];

  let currentTanggal = '';
  let currentKategori = '';

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',');
    if (parts.length < 5) continue;

    const rawTanggal = parts[0].trim();
    const rawKategori = parts[1].trim();
    const rawKriteria = parts[2].trim();
    const rawCount = parts[3].trim();
    const rawValue = parts[4].trim();

    // Skip summary / total rows
    if (
      rawTanggal.toLowerCase().includes('total') || 
      rawTanggal.toLowerCase().includes('grand') ||
      rawKategori.toLowerCase().includes('total') ||
      rawKriteria.toLowerCase().includes('total')
    ) {
      continue;
    }

    if (rawTanggal !== '') {
      currentTanggal = rawTanggal;
    }
    if (rawKategori !== '') {
      currentKategori = rawKategori;
    }

    if (rawKriteria !== '') {
      const parsedCount = parseInt(rawCount.replace(/\./g, ''), 10) || 0;
      const parsedValue = parseFloat(rawValue.replace(/\./g, '')) || 0;

      records.push({
        tanggal: currentTanggal,
        kategori: currentKategori,
        kriteria: rawKriteria,
        count: parsedCount,
        value: parsedValue,
      });
    }
  }

  return records.length > 0 ? records : FALLBACK_CSV_DATA;
}

export function formatRupiah(num: number): string {
  return `Rp ${num.toLocaleString('id-ID')}`;
}

export function formatRupiahCompact(num: number): string {
  if (num >= 1_000_000_000) {
    return `Rp ${(num / 1_000_000_000).toFixed(2)} M`;
  }
  if (num >= 1_000_000) {
    return `Rp ${(num / 1_000_000).toFixed(1)} Juta`;
  }
  return `Rp ${num.toLocaleString('id-ID')}`;
}
