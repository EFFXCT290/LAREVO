import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// Helper to convert BigInt fields to strings recursively and preserve Date objects
function convertBigInts(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(convertBigInts);
  } else if (obj && typeof obj === 'object') {
    // Check if it's a Date object
    if (obj instanceof Date) {
      return obj.toISOString();
    }
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => {
        if (typeof v === 'bigint') {
          return [k, v.toString()];
        } else if (v instanceof Date) {
          return [k, v.toISOString()];
        } else {
          return [k, convertBigInts(v)];
        }
      })
    );
  }
  return obj;
}

function isAdminOrOwner(user: any) {
  return user && (user.role === 'ADMIN' || user.role === 'OWNER');
}

export async function listAllInvitesHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).user;
  if (!isAdminOrOwner(user)) {
    return reply.status(403).send({ error: 'Admin access required.' });
  }

  try {
    const invites = await prisma.invite.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true,
          }
        },
        usedBy: {
          select: {
            id: true,
            username: true,
            email: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return reply.send({ invites: convertBigInts(invites) });
  } catch (error) {
    console.error('Error listing invites:', error);
    return reply.status(500).send({ error: 'Failed to list invites.' });
  }
}

export async function createInviteHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).user;
  if (!isAdminOrOwner(user)) {
    return reply.status(403).send({ error: 'Admin access required.' });
  }

  const { expiresAt } = request.body as any;

  try {
    const code = randomUUID().replace(/-/g, '').substring(0, 16);
    const expiresAtDate = expiresAt ? new Date(expiresAt) : null;

    const invite = await prisma.invite.create({
      data: {
        code,
        createdById: user.id,
        expiresAt: expiresAtDate,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true,
          }
        }
      }
    });

    return reply.send({ invite: convertBigInts(invite) });
  } catch (error) {
    console.error('Error creating invite:', error);
    return reply.status(500).send({ error: 'Failed to create invite.' });
  }
}

export async function deleteInviteHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).user;
  if (!isAdminOrOwner(user)) {
    return reply.status(403).send({ error: 'Admin access required.' });
  }

  const { id } = request.params as any;

  try {
    const invite = await prisma.invite.findUnique({
      where: { id },
      include: {
        usedBy: true
      }
    });

    if (!invite) {
      return reply.status(404).send({ error: 'Invite not found.' });
    }

    if (invite.usedBy) {
      return reply.status(400).send({ error: 'Cannot delete used invite.' });
    }

    await prisma.invite.delete({
      where: { id }
    });

    return reply.send({ success: true });
  } catch (error) {
    console.error('Error deleting invite:', error);
    return reply.status(500).send({ error: 'Failed to delete invite.' });
  }
} 