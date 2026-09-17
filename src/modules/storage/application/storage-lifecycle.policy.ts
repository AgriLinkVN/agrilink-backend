const transitions: Record<string, string[]> = { PENDING: ['UPLOADED', 'FAILED', 'DELETED'], UPLOADED: ['QUARANTINED', 'FAILED', 'DELETED'], QUARANTINED: ['ACTIVE', 'FAILED', 'DELETED'], ACTIVE: ['DELETED'], FAILED: ['DELETED'], DELETED: [] };
export function canTransition(from: string, to: string): boolean { return transitions[from]?.includes(to) ?? false; }
