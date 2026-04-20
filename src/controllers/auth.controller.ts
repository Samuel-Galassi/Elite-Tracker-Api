// IMPORTS
import axios, { isAxiosError } from 'axios';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

// TYPES
type JWTExpiresIn = `${number}d` | `${number}h` | `${number}m` | `${number}s`;

// CONFIG
const clientId = process.env.GH_CLIENT_ID;
const clientSecret = process.env.GH_CLIENT_SECRET;

// CONTROLLER
export class AuthController {
  /**
   * Redireciona para página de autenticação do GitHub
   */
  auth = async (_req: Request, res: Response) => {
    if (!clientId || !process.env.REDIRECT_URL_GH) {
      return res.status(500).json({ error: 'GitHub OAuth not configured' });
    }

    const redirectUrl = `${process.env.REDIRECT_URL_GH}?client_id=${clientId}`;
    res.status(200).json({ redirectUrl });
  };

  /**
   * Recebe código do GitHub, troca por access token
   * e retorna dados do usuário + JWT
   */
  authCallback = async (req: Request, res: Response) => {
    try {
      // Valida código de autorização
      const schema = z.object({
        code: z.string(),
      });

      const validated = schema.safeParse(req.query);

      if (!validated.success) {
        return res
          .status(400)
          .json({ error: 'Authorization code is required' });
      }

      const { code } = validated.data;

      // Verifica URLs configuradas
      if (!process.env.ACCESS_TOKEN_URL || !process.env.USER_URL) {
        return res.status(500).json({
          error: 'Missing environment variables',
        });
      }

      // Troca código por access token
      const accessTokenResult = await axios.post(
        process.env.ACCESS_TOKEN_URL,
        {
          client_id: clientId,
          client_secret: clientSecret,
          code,
        },
        {
          headers: {
            Accept: 'application/json',
          },
        },
      );

      const accessToken = accessTokenResult.data?.access_token;

      if (!accessToken) {
        return res.status(400).json({
          error: 'Failed to obtain access token',
          details: accessTokenResult.data,
        });
      }

      // Busca dados do usuário no GitHub
      const userDataResult = await axios.get(process.env.USER_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const {
        node_id: id,
        avatar_url: avatarUrl,
        name,
        login,
      } = userDataResult.data;

      // Verifica configuração JWT
      if (!process.env.JWT_SECRET || !process.env.JWT_EXPIRES_IN) {
        return res.status(500).json({
          error: 'Missing JWT configuration',
        });
      }

      // Gera token JWT
      const expiresIn = process.env.JWT_EXPIRES_IN as JWTExpiresIn;

      const token = jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn,
      });

      return res.status(200).json({
        user: {
          id,
          avatarUrl,
          name: name || login,
        },
        token,
      });
    } catch (err) {
      if (isAxiosError(err)) {
        return res.status(err.response?.status || 400).json({
          error: err.message,
          details: err.response?.data,
        });
      }
      return res.status(500).json({
        error: 'Internal server error',
      });
    }
  };
}
