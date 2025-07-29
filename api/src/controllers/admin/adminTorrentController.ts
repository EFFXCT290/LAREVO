import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { deleteFile } from '../../services/fileStorageService.js';
import { createNotification } from '../../services/notificationService.js';
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

// List all torrents for admin management
export async function listAllTorrentsForAdminHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;
    if (!user || !['ADMIN', 'MOD', 'OWNER'].includes(user.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const { page = 1, limit = 20, search, categoryId, status } = request.query as any;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { uploader: { username: { contains: search, mode: 'insensitive' } } }
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (status === 'approved') {
      where.isApproved = true;
    } else if (status === 'pending') {
      where.isApproved = false;
    }

    const [torrents, total] = await Promise.all([
      prisma.torrent.findMany({
        where,
        include: {
          uploader: {
            select: {
              id: true,
              username: true,
              email: true
            }
          },
          category: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              announces: true,
              hitAndRuns: true,
              bookmarks: true,
              comments: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.torrent.count({ where })
    ]);

    return reply.send({
      torrents: convertBigInts(torrents),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('[listAllTorrentsForAdminHandler] Error:', error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
}

// Get single torrent for admin management
export async function getTorrentForAdminHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;
    if (!user || !['ADMIN', 'MOD', 'OWNER'].includes(user.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const { id } = request.params as any;

    const torrent = await prisma.torrent.findUnique({
      where: { id },
      include: {
        uploader: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            announces: true,
            hitAndRuns: true,
            bookmarks: true,
            comments: true
          }
        }
      }
    });

    if (!torrent) {
      return reply.status(404).send({ error: 'Torrent not found' });
    }

    return reply.send(convertBigInts(torrent));
  } catch (error) {
    console.error('[getTorrentForAdminHandler] Error:', error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
}

// Update torrent (edit name, description, category, etc.)
export async function updateTorrentHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;
    if (!user || !['ADMIN', 'MOD', 'OWNER'].includes(user.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const { id } = request.params as any;
    const { name, description, categoryId } = request.body as any;

    const torrent = await prisma.torrent.findUnique({
      where: { id },
      include: { uploader: true }
    });

    if (!torrent) {
      return reply.status(404).send({ error: 'Torrent not found' });
    }

    // Validate category if provided
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId }
      });
      if (!category) {
        return reply.status(400).send({ error: 'Invalid category' });
      }
    }

    const updatedTorrent = await prisma.torrent.update({
      where: { id },
      data: {
        name: name || undefined,
        description: description || undefined,
        categoryId: categoryId || undefined
      },
      include: {
        uploader: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Create notification for uploader
    await createNotification({
      userId: torrent.uploaderId,
      message: `Your torrent "${torrent.name}" has been updated by an administrator.`,
      type: 'TORRENT_UPDATE'
    });

    return reply.send(convertBigInts(updatedTorrent));
  } catch (error) {
    console.error('[updateTorrentHandler] Error:', error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
}

// Delete torrent
export async function deleteTorrentHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;
    if (!user || !['ADMIN', 'MOD', 'OWNER'].includes(user.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const { id } = request.params as any;

    const torrent = await prisma.torrent.findUnique({
      where: { id },
      include: { uploader: true }
    });

    if (!torrent) {
      return reply.status(404).send({ error: 'Torrent not found' });
    }

    // Delete associated files
    try {
      const config = await getConfig();
      if (torrent.filePath) {
        // For now, just log the file path since we need to implement proper file lookup
        console.log('[deleteTorrentHandler] Would delete file:', torrent.filePath);
      }
      if (torrent.nfoPath) {
        console.log('[deleteTorrentHandler] Would delete NFO:', torrent.nfoPath);
      }
    } catch (fileError) {
      console.error('[deleteTorrentHandler] File deletion error:', fileError);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database (cascade will handle related records)
    await prisma.torrent.delete({
      where: { id }
    });

    // Create notification for uploader
    await createNotification({
      userId: torrent.uploaderId,
      message: `Your torrent "${torrent.name}" has been deleted by an administrator.`,
      type: 'TORRENT_DELETE'
    });

    return reply.send({ message: 'Torrent deleted successfully' });
  } catch (error) {
    console.error('[deleteTorrentHandler] Error:', error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
}

// Set torrent as freeleech (placeholder for future implementation)
export async function setFreeleechHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;
    if (!user || !['ADMIN', 'MOD', 'OWNER'].includes(user.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const { id } = request.params as any;
    const { isFreeleech } = request.body as any;

    const torrent = await prisma.torrent.findUnique({
      where: { id },
      include: { uploader: true }
    });

    if (!torrent) {
      return reply.status(404).send({ error: 'Torrent not found' });
    }

    // TODO: Implement freeleech logic when the feature is added to the schema
    // For now, just return a placeholder response
    return reply.send({ 
      message: 'Freeleech feature not yet implemented',
      torrentId: id,
      requestedFreeleech: isFreeleech
    });
  } catch (error) {
    console.error('[setFreeleechHandler] Error:', error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
}

// Get torrent statistics for admin
export async function getTorrentDetailedStatsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;
    if (!user || !['ADMIN', 'MOD', 'OWNER'].includes(user.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const { id } = request.params as any;

    const torrent = await prisma.torrent.findUnique({
      where: { id },
      include: {
        announces: {
          select: {
            uploaded: true,
            downloaded: true,
            left: true,
            event: true,
            lastAnnounceAt: true
          }
        },
        _count: {
          select: {
            announces: true,
            hitAndRuns: true,
            bookmarks: true,
            comments: true
          }
        }
      }
    });

    if (!torrent) {
      return reply.status(404).send({ error: 'Torrent not found' });
    }

    // Calculate statistics
    const totalUploaded = torrent.announces.reduce((sum, announce) => sum + announce.uploaded, BigInt(0));
    const totalDownloaded = torrent.announces.reduce((sum, announce) => sum + announce.downloaded, BigInt(0));
    const activePeers = torrent.announces.filter(a => a.event !== 'stopped').length;
    const seeders = torrent.announces.filter(a => a.left === BigInt(0)).length;
    const leechers = torrent.announces.filter(a => a.left > BigInt(0)).length;

    const stats = {
      torrent: convertBigInts(torrent),
      statistics: {
        totalUploaded: totalUploaded.toString(),
        totalDownloaded: totalDownloaded.toString(),
        activePeers,
        seeders,
        leechers,
        bookmarks: torrent._count.bookmarks,
        comments: torrent._count.comments,
        hitAndRuns: torrent._count.hitAndRuns
      }
    };

    return reply.send(stats);
  } catch (error) {
    console.error('[getTorrentStatsHandler] Error:', error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
} 