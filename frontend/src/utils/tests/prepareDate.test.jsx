import { prepareDate } from '../prepareDate';

describe('prepareDate tests', () => {
  it('should return a correct formatted date when mode is default', () => {
    const date = new Date('2025-01-01');
    const result = prepareDate(date);
    expect(result).toBe('01.01.2025');
  });

  it('should return a correct formatted date when mode is withMonthName', () => {
    const date = new Date('2025-01-01');
    const result = prepareDate(date, 'withMonthName');
    expect(result).toBe('01 Jan 2025');
  });

  it('should return a correct formatted date when mode is withSeconds', () => {
    const date = new Date('2025-01-01T00:00:00');
    const result = prepareDate(date, 'withSeconds');
    expect(result).toBe('01 Jan 2025 00:00:00');
  });

  it('should return a correct formatted date when mode is withMinutesAndMonthName', () => {
    const date = new Date('2025-01-01T00:00:00');
    const result = prepareDate(date, 'withMinutesAndMonthName');
    expect(result).toBe('01 Jan 2025, 00:00');
  });
});
