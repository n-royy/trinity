import { Router, Request, Response } from 'express';

const router = Router();

/**
 * @swagger
 * /ping:
 *   get:
 *     summary: Checks if the server is running.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is operational.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: pong
 */
router.get('/ping', (req: Request, res: Response) => {
  res.json({ message: 'pong' });
});

export default router;
