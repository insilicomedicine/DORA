import { DocumentStage, DocumentStatus } from 'types/document';
import { checkShouldShowStatus } from 'utils/editor';

describe('checkShouldShowStatus', () => {
  it('returns true when stage is polishing and checkedStatus is in_progress or polishing (not completed)', () => {
    const result1 = checkShouldShowStatus(
      false,
      'polishing' as DocumentStage,
      'in_progress' as DocumentStatus
    );
    const result2 = checkShouldShowStatus(
      false,
      'polishing' as DocumentStage,
      'polishing' as DocumentStatus
    );
    expect(result1).toBe(true);
    expect(result2).toBe(true);
  });

  it('returns false when stage is polishing and checkedStatus is not in_progress or polishing (not completed)', () => {
    const result = checkShouldShowStatus(
      false,
      'polishing' as DocumentStage,
      'completed' as DocumentStatus
    );
    expect(result).toBe(false);
  });

  it('returns true when not polishing and checkedStatus is in_progress, completed, or failed (not completed)', () => {
    const result1 = checkShouldShowStatus(
      false,
      'other' as DocumentStage,
      'in_progress' as DocumentStatus
    );
    const result2 = checkShouldShowStatus(
      false,
      'other' as DocumentStage,
      'completed' as DocumentStatus
    );
    const result3 = checkShouldShowStatus(
      false,
      'other' as DocumentStage,
      'failed' as DocumentStatus
    );
    expect(result1).toBe(true);
    expect(result2).toBe(true);
    expect(result3).toBe(true);
  });

  it('returns false when not polishing and checkedStatus is not in_progress, completed, or failed (not completed)', () => {
    const result = checkShouldShowStatus(
      false,
      'other' as DocumentStage,
      'limited' as DocumentStatus
    );
    expect(result).toBe(false);
  });

  it('returns true for completed papers when checkedStatus is failed, limited, or polishing', () => {
    const result1 = checkShouldShowStatus(
      true,
      'any' as DocumentStage,
      'failed' as DocumentStatus
    );
    const result2 = checkShouldShowStatus(
      true,
      'any' as DocumentStage,
      'limited' as DocumentStatus
    );
    const result3 = checkShouldShowStatus(
      true,
      'any' as DocumentStage,
      'polishing' as DocumentStatus
    );
    expect(result1).toBe(true);
    expect(result2).toBe(true);
    expect(result3).toBe(true);
  });

  it('returns false for completed papers when checkedStatus is not failed, limited, or polishing', () => {
    const result = checkShouldShowStatus(
      true,
      'any' as DocumentStage,
      'in_progress' as DocumentStatus
    );
    expect(result).toBe(false);
  });
});
