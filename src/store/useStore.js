import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import localforage from 'localforage'
import {
  DEFAULT_SHIFTS,
  DEFAULT_AREAS,
  DEFAULT_POSITIONS,
  INITIAL_ROSTER,
} from '../utils/constants'

// LocalForage storage engine for Zustand
const storage = {
  getItem: async (name) => {
    const value = await localforage.getItem(name)
    return value ?? null
  },
  setItem: async (name, value) => {
    await localforage.setItem(name, value)
  },
  removeItem: async (name) => {
    await localforage.removeItem(name)
  },
}

const INITIAL_STATE = {
  personnel: INITIAL_ROSTER,
  tags: [],
  assignments: {},
  log: [],
  areas: DEFAULT_AREAS,
  positions: DEFAULT_POSITIONS,
  shifts: DEFAULT_SHIFTS,
  blueprints: [
    {
      id: 'bp_default_assembly',
      name: 'Standard Assembly Hall',
      areas: DEFAULT_AREAS,
      positions: DEFAULT_POSITIONS,
      shifts: DEFAULT_SHIFTS,
    },
  ],
  rules: {
    capabilitySeverity: 'error',
    doubleBookingSeverity: 'error',
    unavailableSeverity: 'error',
    avoidConsecutive: true,
    anchorLimits: true,
    maxWorkPercent: 50,
    auditoriumRotationMode: false,
    auditoriumCoverage: 25,
  },
  lastUpdated: 0
}

export const useStore = create(
  persist(
    (set) => ({
      ...INITIAL_STATE,
      
      // History State for Undo/Redo
      past: [],
      future: [],

      // Provide the same massive updateState function to avoid refactoring everything at once
      updateState: (updates) => set((state) => {
        // Collect current state to push to past
        const currentState = {
          personnel: state.personnel,
          tags: state.tags,
          assignments: state.assignments,
          log: state.log,
          areas: state.areas,
          positions: state.positions,
          shifts: state.shifts,
          blueprints: state.blueprints,
          rules: state.rules,
          lastUpdated: state.lastUpdated
        };

        const newPast = [...state.past, currentState];
        if (newPast.length > 50) newPast.shift();

        return {
          ...updates,
          lastUpdated: Date.now(),
          past: newPast,
          future: [] // clear redo history on new action
        };
      }),

      undo: () => set((state) => {
        if (state.past.length === 0) return state;
        const previous = state.past[state.past.length - 1];
        const newPast = state.past.slice(0, state.past.length - 1);
        
        const currentState = {
          personnel: state.personnel,
          tags: state.tags,
          assignments: state.assignments,
          log: state.log,
          areas: state.areas,
          positions: state.positions,
          shifts: state.shifts,
          blueprints: state.blueprints,
          rules: state.rules,
          lastUpdated: state.lastUpdated
        };

        return {
          ...previous,
          past: newPast,
          future: [currentState, ...state.future]
        };
      }),

      redo: () => set((state) => {
        if (state.future.length === 0) return state;
        const next = state.future[0];
        const newFuture = state.future.slice(1);
        
        const currentState = {
          personnel: state.personnel,
          tags: state.tags,
          assignments: state.assignments,
          log: state.log,
          areas: state.areas,
          positions: state.positions,
          shifts: state.shifts,
          blueprints: state.blueprints,
          rules: state.rules,
          lastUpdated: state.lastUpdated
        };

        return {
          ...next,
          past: [...state.past, currentState],
          future: newFuture
        };
      }),

      resetHistory: (newState) => set(() => ({
        ...newState,
        past: [],
        future: []
      })),

      clearStore: () => set(() => ({ ...INITIAL_STATE, past: [], future: [] }))

    }),
    {
      name: 'attendant-scheduler-storage',
      storage: createJSONStorage(() => storage),
      // Don't persist history state to avoid blowing up DB size
      partialize: (state) => Object.fromEntries(
        Object.entries(state).filter(([key]) => !['past', 'future'].includes(key))
      ),
    }
  )
)
