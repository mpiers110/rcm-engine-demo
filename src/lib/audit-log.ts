import type { AuditLogEntry } from './types';
import { prisma } from './prisma';

// The audit log is now written to the database.
// This file provides helper functions to interact with it.

export async function addToAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'> & { timestamp: string }) {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        details: entry.details,
        timestamp: new Date(entry.timestamp),
        userId: entry.userId,
      },
    });
  } catch (error) {
    console.error("Failed to write to audit log:", error);
  }
}

export async function getAuditLog(userId: string): Promise<AuditLogEntry[]> {
  try {
    const logs = await prisma.auditLog.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 100,
    });
    // Convert Date objects to ISO strings for serialization
    return logs.map(log => ({ ...log, timestamp: log.timestamp.toISOString() }));
  } catch (error) {
    console.error("Failed to read from audit log:", error);
    return [];
  }
}
