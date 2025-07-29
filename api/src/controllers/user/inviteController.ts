import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { getConfig } from '../../services/configService.js';

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

export async function createUserInviteHandler(request: FastifyRequest, reply: FastifyReply) {
  const jwtUser = (request as any).user;
  if (!jwtUser) {
    return reply.status(401).send({ error: 'Authentication required.' });
  }

  // Log the request for debugging
  console.log('createUserInviteHandler called with user:', jwtUser.id);

  try {
    // Fetch full user data from database to get bonus points
    const user = await prisma.user.findUnique({
      where: { id: jwtUser.id },
      select: { id: true, bonusPoints: true }
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found.' });
    }

    const config = await getConfig();
    const bonusPointsRequired = config.bonusPointsPerInvite;

    // Check if user has enough bonus points
    if (user.bonusPoints < bonusPointsRequired) {
      return reply.status(400).send({ 
        error: `Insufficient bonus points. You need ${bonusPointsRequired} bonus points to create an invite. You have ${user.bonusPoints} bonus points.` 
      });
    }

    // Generate invite code
    const code = randomUUID().replace(/-/g, '').substring(0, 16);
    
    // Set expiration to 30 days from now
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Create invite and deduct bonus points in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the invite
      const invite = await tx.invite.create({
        data: {
          code,
          createdById: user.id,
          expiresAt,
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

      // Deduct bonus points from user
      await tx.user.update({
        where: { id: user.id },
        data: { bonusPoints: { decrement: bonusPointsRequired } }
      });

      return invite;
    });

    return reply.send({ 
      invite: convertBigInts(result),
      message: `Invite created successfully! ${bonusPointsRequired} bonus points deducted.`
    });
  } catch (error) {
    console.error('Error creating user invite:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return reply.status(500).send({ error: 'Failed to create invite.' });
  }
}

export async function listUserInvitesHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).user;
  if (!user) {
    return reply.status(401).send({ error: 'Authentication required.' });
  }

  try {
    const invites = await prisma.invite.findMany({
      where: {
        createdById: user.id
      },
      include: {
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
    console.error('Error listing user invites:', error);
    return reply.status(500).send({ error: 'Failed to list invites.' });
  }
} 