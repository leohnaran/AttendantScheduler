import { describe, it, expect } from 'vitest';
import { 
  getAssignId, 
  isAutoAssigned, 
  getKeyManName, 
  getLastName, 
  getHeatColor, 
  parseAssignmentKey,
  checkQualification
} from './helpers';
import { Person, Position, Area } from '../types/models';

describe('Helper Utility Functions', () => {
  describe('getAssignId', () => {
    it('returns null for empty values', () => {
      expect(getAssignId(null)).toBeNull();
      expect(getAssignId(undefined)).toBeNull();
    });

    it('returns id from assignment object', () => {
      expect(getAssignId({ id: 5, isAuto: true })).toBe(5);
      expect(getAssignId({ id: '10' })).toBe(10);
    });

    it('returns parsed int from string/number', () => {
      expect(getAssignId('15')).toBe(15);
      expect(getAssignId(20)).toBe(20);
    });
  });

  describe('isAutoAssigned', () => {
    it('returns true if object and isAuto is true', () => {
      expect(isAutoAssigned({ id: 1, isAuto: true })).toBe(true);
    });

    it('returns false if object and isAuto is false', () => {
      expect(isAutoAssigned({ id: 1, isAuto: false })).toBe(false);
    });

    it('returns false for primitives or null', () => {
      expect(isAutoAssigned(1)).toBe(false);
      expect(isAutoAssigned(null)).toBe(false);
    });
  });

  describe('getKeyManName', () => {
    it('returns name of keyman if found', () => {
      const personnel: Person[] = [{ id: 1, name: 'John Doe' }];
      expect(getKeyManName(personnel, 1)).toBe('John Doe');
    });

    it('returns empty string if not found', () => {
      expect(getKeyManName([], 1)).toBe('');
    });
  });

  describe('getLastName', () => {
    it('returns last word lowercased', () => {
      expect(getLastName('John Smith')).toBe('smith');
      expect(getLastName('Jane Doe Roe')).toBe('roe');
    });

    it('returns empty string if empty input', () => {
      expect(getLastName('')).toBe('');
    });
  });

  describe('parseAssignmentKey', () => {
    it('returns default shiftId all if no underscore', () => {
      const res = parseAssignmentKey('pos1', []);
      expect(res.posId).toBe('pos1');
      expect(res.shiftId).toBe('all');
    });

    it('parses posId and shiftId when valid shift is present', () => {
      const shifts = [{ id: 's1', label: 'Morning' }];
      const res = parseAssignmentKey('pos1_s1', shifts);
      expect(res.posId).toBe('pos1');
      expect(res.shiftId).toBe('s1');
    });

    it('leaves shift as part of posId if shift not in list', () => {
      const shifts = [{ id: 's1', label: 'Morning' }];
      const res = parseAssignmentKey('pos1_s2', shifts);
      expect(res.posId).toBe('pos1_s2');
      expect(res.shiftId).toBe('all');
    });
  });
});

describe('Validation Engine', () => {
  it('fails if area is not found', () => {
    const person: Person = { id: 1, name: 'Test' };
    const pos: Position = { id: 'p1', name: 'Pos', areaId: 'a1', type: 'rotational' };
    const res = checkQualification(person, pos, 'all', [], [], []);
    expect(res.qualified).toBe(false);
    expect(res.reason).toBe('Area not found');
  });

  it('fails if person lacks capability', () => {
    const person: Person = { id: 1, name: 'Test', caps: [] };
    const pos: Position = { id: 'p1', name: 'Pos', areaId: 'a1', type: 'rotational' };
    const areas: Area[] = [{ id: 'a1', name: 'Area', capability: 'required-cap' }];
    const res = checkQualification(person, pos, 'all', areas, [], []);
    expect(res.qualified).toBe(false);
    expect(res.reason).toBe('Missing Capability: Area');
  });

  it('passes if person has capability', () => {
    const person: Person = { id: 1, name: 'Test', caps: ['required-cap'] };
    const pos: Position = { id: 'p1', name: 'Pos', areaId: 'a1', type: 'rotational' };
    const areas: Area[] = [{ id: 'a1', name: 'Area', capability: 'required-cap' }];
    const res = checkQualification(person, pos, 'all', areas, [], []);
    expect(res.qualified).toBe(true);
  });
});
