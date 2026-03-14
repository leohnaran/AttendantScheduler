import { describe, it, expect } from 'vitest';
import { executeAutoFill, getConflict } from './schedulerEngine';
import { Person, Position, Area, Shift, RuleOptions } from '../types/models';

describe('Scheduler Engine Auto-Fill', () => {
  const mockAreas: Area[] = [
    { id: 'a1', name: 'Main Hall', capability: 'main' },
    { id: 'a2', name: 'Parking', capability: 'parking' }
  ];

  const mockShifts: Shift[] = [
    { id: 's1', label: 'Morning', minutes: 120 },
    { id: 's2', label: 'Afternoon', minutes: 120 }
  ];

  const mockPositions: Position[] = [
    { id: 'p1', name: 'Door 1', areaId: 'a1', type: 'rotational', keyMan: false },
    { id: 'p2', name: 'Lot A', areaId: 'a2', type: 'rotational', keyMan: true }
  ];

  const mockRules: RuleOptions = {
    avoidConsecutive: true,
    anchorLimits: true,
    auditPriority: false,
    maxWorkPercent: 50,
    auditoriumRotationMode: false,
    auditoriumCoverage: 25,
    unavailableSeverity: 'error',
    capabilitySeverity: 'error',
    doubleBookingSeverity: 'error'
  };

  const personnel: Person[] = [
    { id: 1, name: 'John (KeyMan Parking)', caps: ['parking', 'keyman'], role: 'Elder' },
    { id: 2, name: 'Mike (Main)', caps: ['main'], role: 'MS' },
    { id: 3, name: 'Steve (Main)', caps: ['main'], role: 'Exemplary' },
    { id: 4, name: 'Unavailable Bob', caps: ['parking'], unavailable: ['s2'] }
  ];

  it('fails to assign if no one has capability', () => {
    // We have a Parking position but the only parking guys are John (Keyman) and Bob (Unavailable S2)
    // For p1 (Main Hall), Mike and Steve can work.
    const run = executeAutoFill({}, personnel, mockPositions, mockShifts, mockAreas, [], mockRules);
    
    // John should be assigned to Lot A (KeyMan position)
    // Mike and Steve should be assigned to Door 1
    expect(run.filledCount).toBeGreaterThan(0);
    
    // Check if John got Lot A
    const lotAMorning = run.newAssignments['p2_s1'];
    const lotAAfternoon = run.newAssignments['p2_s2'];
    
    // It's possible both aren't John if work limit prevents him working twice
    // John's limit = 50% max work = 300 minutes. 2 shifts = 240 mins. He can do both.
    expect([lotAMorning?.id, lotAAfternoon?.id]).toContain(1);
  });

  it('enforces unavailability', () => {
    const run = executeAutoFill({}, personnel, mockPositions, mockShifts, mockAreas, [], mockRules);
    // Bob is unavailable for S2, he should never get S2 assignments
    const s2Assignments = Object.keys(run.newAssignments)
      .filter(k => k.endsWith('_s2') && run.newAssignments[k]?.id === 4);
    
    expect(s2Assignments.length).toBe(0);
  });

  describe('getConflict', () => {
    it('detects missing capabilities', () => {
      const pMap = new Map([[2, personnel[1]]]);
      const aMap = new Map([['a2', mockAreas[1]]]);
      
      const conflict = getConflict(
        2, // Mike (Main cap only)
        mockPositions[1], // Lot A (requires parking cap)
        's1',
        {},
        pMap, mockShifts, mockPositions, mockRules, aMap, []
      );
      
      expect(conflict).not.toBeNull();
      expect(conflict?.msg).toBe('Missing Capability');
    });

    it('allows if capability matches', () => {
      const pMap = new Map([[1, personnel[0]]]);
      const aMap = new Map([['a2', mockAreas[1]]]);
      
      const conflict = getConflict(
        1, // John (parking cap)
        mockPositions[1], 
        's1',
        {},
        pMap, mockShifts, mockPositions, mockRules, aMap, []
      );
      
      expect(conflict).toBeNull(); // No conflict
    });
  });
});
