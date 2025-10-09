import { isBeforeCheckData } from '../utils';

describe('isBeforeCheckData', () => {
  it('should return true when createdAt is before checkDate', () => {
    const createdAt = new Date('2023-10-01T12:00:00');
    const checkDate = new Date('2023-10-02T12:00:00');
    expect(isBeforeCheckData(createdAt, checkDate)).toBe(true);
  });

  it('should return false when createdAt is the same as checkDate', () => {
    const createdAt = new Date('2023-10-02T12:00:00');
    const checkDate = new Date('2023-10-02T12:00:00');
    expect(isBeforeCheckData(createdAt, checkDate)).toBe(false);
  });

  it('should return false when createdAt is after checkDate', () => {
    const createdAt = new Date('2023-10-03T12:00:00');
    const checkDate = new Date('2023-10-02T12:00:00');
    expect(isBeforeCheckData(createdAt, checkDate)).toBe(false);
  });
});
