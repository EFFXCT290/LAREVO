import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/authMiddleware.js';
import { 
  uploadTorrentHandler, 
  listTorrentsHandler, 
  getTorrentHandler, 
  getNfoHandler, 
  approveTorrentHandler, 
  rejectTorrentHandler, 
  listAllTorrentsHandler,
  getTorrentStatsHandler,
  recalculateUserStatsHandler,
  downloadTorrentHandler
} from '../controllers/torrentController.js';
import {
  listAllTorrentsForAdminHandler,
  getTorrentForAdminHandler,
  updateTorrentHandler,
  deleteTorrentHandler,
  setFreeleechHandler,
  getTorrentDetailedStatsHandler
} from '../controllers/admin/adminTorrentController.js';
import { requireAuthIfNotOpen } from '../middleware/authOrOpenMiddleware.js';
import {
  listCommentsForTorrentHandler,
  createCommentForTorrentHandler,
  editCommentHandler,
  deleteCommentHandler,
  voteCommentHandler
} from '../controllers/commentController.js';

export async function registerTorrentRoutes(app: FastifyInstance) {
  app.post('/torrent/upload', { preHandler: requireAuth }, uploadTorrentHandler); //DONE
  app.get('/torrent/:id/download', { preHandler: requireAuth }, downloadTorrentHandler);
  app.get('/torrent/list', { preHandler: requireAuthIfNotOpen }, listTorrentsHandler); //DONE
  app.get('/torrent/:id', { preHandler: requireAuthIfNotOpen }, getTorrentHandler); //DONE
  app.get('/torrent/:id/nfo', { preHandler: requireAuthIfNotOpen }, getNfoHandler); //DONE
  app.post('/admin/torrent/:id/approve', { preHandler: requireAuth }, approveTorrentHandler); //DONE
  app.post('/admin/torrent/:id/reject', { preHandler: requireAuth }, rejectTorrentHandler); //DONE
  app.get('/admin/torrents', { preHandler: requireAuth }, listAllTorrentsHandler); //DONE - General admin listing
  app.get('/admin/torrents/stats', { preHandler: requireAuth }, getTorrentStatsHandler); //DONE - General stats
  app.get('/admin/torrents/manage', { preHandler: requireAuth }, listAllTorrentsForAdminHandler); //DONE - Management listing
  app.get('/admin/torrents/manage/:id', { preHandler: requireAuth }, getTorrentForAdminHandler);
  app.put('/admin/torrents/manage/:id', { preHandler: requireAuth }, updateTorrentHandler);
  app.delete('/admin/torrents/manage/:id', { preHandler: requireAuth }, deleteTorrentHandler);
  app.post('/admin/torrents/manage/:id/freeleech', { preHandler: requireAuth }, setFreeleechHandler);
  app.get('/admin/torrents/manage/:id/stats', { preHandler: requireAuth }, getTorrentDetailedStatsHandler);
  app.post('/admin/recalculate-user-stats', { preHandler: requireAuth }, recalculateUserStatsHandler); //DONE
  app.get('/torrent/:id/comments', listCommentsForTorrentHandler);
  app.post('/torrent/:id/comments', { preHandler: requireAuth }, createCommentForTorrentHandler);
  app.put('/comments/:commentId', { preHandler: requireAuth }, editCommentHandler);
  app.delete('/comments/:commentId', { preHandler: requireAuth }, deleteCommentHandler);
  app.post('/comments/:commentId/vote', { preHandler: requireAuth }, voteCommentHandler);
} 