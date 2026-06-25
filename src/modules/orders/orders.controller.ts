import type { Request, Response, NextFunction } from 'express';
import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
// @ts-ignore
import pkg from 'pg';
import { env } from '../../config/env.js';
import { supabaseAdmin } from '../../config/supabase.js';
import { AppError } from '../../shared/errors/app-error.js';
import { calculateRequestHash } from '../../shared/utils/idempotency.js';

const { Pool } = pkg;
const pool = env.DATABASE_URL ? new Pool({ connectionString: env.DATABASE_URL }) : null;

// =================================================================
// 🔐 UTILITY PER IL GUEST TOKEN (HMAC SHA256 NATIVO)
// =================================================================
const TOKEN_SECRET = env.DATABASE_URL || 'poke-panini-super-secret-key-fallback';
const TOKEN_DURATION_MS = 24 * 60 * 60 * 1000; // Durata: 24 ore

function generateGuestToken(orderId: string): string {
  const payload = { orderId, exp: Date.now() + TOKEN_DURATION_MS };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', TOKEN_SECRET).update(payloadBase64).digest('base64url');
  return `${payloadBase64}.${signature}`;
}

function verifyGuestToken(token: string, orderId: string): boolean {
  try {
    const [payloadBase64, signature] = token.split('.');
    if (!payloadBase64 || !signature) return false;

    const expectedSignature = createHmac('sha256', TOKEN_SECRET).update(payloadBase64).digest('base64url');
    
    // timingSafeEqual protegge dai Timing Attacks (Criterio di Accettazione 4)
    const isSignatureValid = timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    if (!isSignatureValid) return false;

    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
    return Date.now() <= payload.exp && payload.orderId === orderId;
  } catch {
    return false;
  }
}

// =================================================================
// 📥 1. CREAZIONE ORDINE (BE-014 CON INTEGRAZIONE TOKEN BE-015)
// =================================================================
export async function createOrder(req: Request, res: Response, next: NextFunction) {
  const idempotencyKey = req.headers['idempotency-key'] as string;
  const currentHash = calculateRequestHash(req.body);
  const { clienteId, noteCliente, items } = req.body;

  // ----------------------------------------------------------------
  // STRADA A: MODALITÀ POSTGRES NATIVO / LOCALE
  // ----------------------------------------------------------------
  if (env.DATABASE_PROVIDER === 'postgres') {
    if (!pool) {
      return next(new AppError('INTERNAL_SERVER_ERROR', 500, 'DATABASE_URL non configurato nel file .env.'));
    }

    let dbClient;
    try {
      dbClient = await pool.connect();
    } catch (connErr: any) {
      if (connErr.code === 'ECONNREFUSED') {
        return next(new AppError('INTERNAL_SERVER_ERROR', 500, 'Il database Postgres locale o il container Docker è SPENTO! Avvialo sulla porta 5432 per procedere.'));
      }
      return next(connErr);
    }

    try {
      await dbClient.query('BEGIN');

      const cachedKey = await dbClient.query('SELECT * FROM public.idempotency_keys WHERE key = $1', [idempotencyKey]);
      if (cachedKey.rows.length > 0) {
        const row = cachedKey.rows[0];
        if (row.request_hash !== currentHash) {
          throw new AppError('CONFLICT', 409, 'Chiave di idempotenza già usata con un payload differente.');
        }
        await dbClient.query('ROLLBACK');
        return res.status(row.response_status || 200).json(row.response_body);
      }

      let subtotal = 0;
      const orderId = randomUUID();
      const processedItems = [];

      for (const item of items) {
        const productRes = await dbClient.query('SELECT price FROM public.products WHERE id = $1', [item.prodottoId]);
        if (productRes.rows.length === 0) {
          throw new AppError('BAD_REQUEST', 400, `Prodotto non trovato: ${item.prodottoId}`);
        }
        const itemPrice = Number(productRes.rows[0].price);
        subtotal += itemPrice * item.quantita;

        processedItems.push({
          id: randomUUID(),
          prodottoId: item.prodottoId,
          quantita: item.quantita,
          priceSnapshot: itemPrice,
          selections: item.selections || []
        });
      }

      await dbClient.query(
        `INSERT INTO public.orders (id, customer_id, status, total, subtotal, notes, idempotency_key) VALUES ($1, $2, 'PENDING', $3, $4, $5, $6)`,
        [orderId, clienteId, subtotal, subtotal, noteCliente || null, idempotencyKey]
      );

      for (const pItem of processedItems) {
        await dbClient.query(
          `INSERT INTO public.order_items (id, order_id, product_id, quantity, price_at_order) VALUES ($1, $2, $3, $4, $5)`,
          [pItem.id, orderId, pItem.prodottoId, pItem.quantita, pItem.priceSnapshot]
        );
        for (const selection of pItem.selections) {
          await dbClient.query(
            `INSERT INTO public.order_item_ingredients (id, order_item_id, ingredient_id) VALUES ($1, $2, $3)`,
            [randomUUID(), pItem.id, selection]
          );
        }
      }

      // Generazione guestToken per utenti non autenticati
      const guestToken = generateGuestToken(orderId);
      const responseBody = { status: 'success', orderId, total: subtotal, guestToken, message: 'Ordine creato con successo.' };

      await dbClient.query(
        `INSERT INTO public.idempotency_keys (key, request_hash, order_id, response_status, response_body) VALUES ($1, $2, $3, 201, $4)`,
        [idempotencyKey, currentHash, orderId, JSON.stringify(responseBody)]
      );

      await dbClient.query('COMMIT');
      return res.status(201).json(responseBody);
    } catch (err) {
      await dbClient.query('ROLLBACK');
      return next(err);
    } finally {
      dbClient.release();
    }
  }

  // ----------------------------------------------------------------
  // STRADA B: MODALITÀ SUPABASE / INTERFACCIA API
  // ----------------------------------------------------------------
  try {
    const { data: cachedKey, error: errKey } = await (supabaseAdmin.from('idempotency_keys') as any)
      .select('*')
      .eq('key', idempotencyKey)
      .maybeSingle();

    if (errKey) throw errKey;
    if (cachedKey) {
      if (cachedKey.request_hash !== currentHash) {
        throw new AppError('CONFLICT', 409, 'Chiave di idempotenza già usata con un payload differente.');
      }
      return res.status(cachedKey.response_status || 200).json(cachedKey.response_body);
    }

    let subtotal = 0;
    const orderId = randomUUID();
    const clientBypass = supabaseAdmin as any;
    const processedItems = [];

    for (const item of items) {
      const { data: product, error: errProd } = await clientBypass
        .from('products')
        .select('price')
        .eq('id', item.prodottoId)
        .maybeSingle();

      if (errProd || !product) {
        throw new AppError('BAD_REQUEST', 400, `Prodotto non trovato: ${item.prodottoId}`);
      }
      const itemPrice = Number(product.price);
      subtotal += itemPrice * item.quantita;

      processedItems.push({
        id: randomUUID(),
        prodottoId: item.prodottoId,
        quantita: item.quantita,
        priceSnapshot: itemPrice,
        selections: item.selections || []
      });
    }

    const { error: errOrd } = await (supabaseAdmin.from('orders') as any).insert({
      id: orderId,
      customer_id: clienteId,
      status: 'PENDING',
      total: subtotal,
      subtotal,
      notes: noteCliente || null,
      idempotency_key: idempotencyKey
    });
    if (errOrd) throw errOrd;

    for (const pItem of processedItems) {
      await (supabaseAdmin.from('order_items') as any).insert({
        id: pItem.id,
        order_id: orderId,
        product_id: pItem.prodottoId,
        quantity: pItem.quantita,
        price_at_order: pItem.priceSnapshot
      });

      for (const selection of pItem.selections) {
        await (supabaseAdmin.from('order_item_ingredients') as any).insert({
          id: randomUUID(),
          order_item_id: pItem.id,
          ingredient_id: selection
        });
      }
    }

    // Generazione guestToken per utenti non autenticati
    const guestToken = generateGuestToken(orderId);
    const responseBody = { status: 'success', orderId, total: subtotal, guestToken, message: 'Ordine creato con successo.' };

    await (supabaseAdmin.from('idempotency_keys') as any).insert({
      key: idempotencyKey,
      request_hash: currentHash,
      order_id: orderId,
      response_status: 201,
      response_body: responseBody
    });

    return res.status(201).json(responseBody);
  } catch (error) {
    return next(error);
  }
}

// =================================================================
// 📤 2. LETTURA ORDINE PROTETTA (BE-015 NUOVA IMPLEMENTAZIONE)
// =================================================================
export async function getOrderById(req: Request, res: Response, next: NextFunction) {
const orderId = req.params.id as string;
  const guestToken = req.headers['x-guest-token'] as string;
  
  // @ts-ignore
  const authenticatedUserId = req.user?.id;

  // Errore generico uniforme per evitare Information Leakage (Criterio 4)
  const uniformNotFoundError = new AppError('NOT_FOUND', 404, 'Ordine non trovato o non autorizzato.');

  // ----------------------------------------------------------------
  // STRADA A: LETTURA POSTGRES NATIVO
  // ----------------------------------------------------------------
  if (env.DATABASE_PROVIDER === 'postgres') {
    if (!pool) return next(uniformNotFoundError);

    let dbClient;
    try {
      dbClient = await pool.connect();
    } catch {
      return next(uniformNotFoundError);
    }

    try {
      const orderRes = await dbClient.query(
        'SELECT id, customer_id, status, total, subtotal, notes, created_at FROM public.orders WHERE id = $1',
        [orderId]
      );

      if (orderRes.rows.length === 0) {
        // Eseguiamo una verifica fittizia per mantenere i tempi di risposta allineati (Anti-Timing Attack)
        verifyGuestToken(guestToken || 'dummy.token', orderId);
        return next(uniformNotFoundError);
      }

      const order = orderRes.rows[0];

      // Controllo autorizzazioni (User registrato VS Guest)
      let isAuthorized = false;
      if (authenticatedUserId && order.customer_id === authenticatedUserId) {
        isAuthorized = true;
      } else if (guestToken && verifyGuestToken(guestToken, orderId)) {
        isAuthorized = true;
      }

      if (!isAuthorized) return next(uniformNotFoundError);

      // Recupero articoli e dettagli prodotti
      const itemsRes = await dbClient.query(
        `SELECT oi.id, oi.quantity, oi.price_at_order, p.name as product_name, p.description as product_description
         FROM public.order_items oi
         LEFT JOIN public.products p ON oi.product_id = p.id
         WHERE oi.order_id = $1`,
        [orderId]
      );

      // Data Masking: Espone solo lo stretto necessario per la conferma d'ordine
      const cleanData = {
        id: order.id,
        status: order.status,
        subtotal: Number(order.subtotal),
        total: Number(order.total),
        notes: order.notes,
        createdAt: order.created_at,
        items: itemsRes.rows.map(item => ({
          id: item.id,
          quantity: item.quantity,
          priceAtOrder: Number(item.price_at_order),
          productName: item.product_name || 'Prodotto',
          description: item.product_description || ''
        }))
      };

      return res.status(200).json({ status: 'success', data: cleanData });
    } catch (err) {
      return next(err);
    } {
      dbClient.release();
    }
  }

  // ----------------------------------------------------------------
  // STRADA B: LETTURA VIA SUPABASE API
  // ----------------------------------------------------------------
  try {
    const clientBypass = supabaseAdmin as any;

    const { data: order, error: errOrd } = await clientBypass
      .from('orders')
      .select('id, customer_id, status, total, subtotal, notes, created_at')
      .eq('id', orderId)
      .maybeSingle();

    if (errOrd || !order) {
      verifyGuestToken(guestToken || 'dummy.token', orderId);
      return next(uniformNotFoundError);
    }

    let isAuthorized = false;
    if (authenticatedUserId && order.customer_id === authenticatedUserId) {
      isAuthorized = true;
    } else if (guestToken && verifyGuestToken(guestToken, orderId)) {
      isAuthorized = true;
    }

    if (!isAuthorized) return next(uniformNotFoundError);

    // Lettura articoli e join sui prodotti
    const { data: items, error: errItems } = await clientBypass
      .from('order_items')
      .select('id, quantity, price_at_order, products (name, description)')
      .eq('order_id', orderId);

    if (errItems || !items) return next(uniformNotFoundError);

    const cleanData = {
      id: order.id,
      status: order.status,
      subtotal: Number(order.subtotal),
      total: Number(order.total),
      notes: order.notes,
      createdAt: order.created_at,
      items: items.map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        priceAtOrder: Number(item.price_at_order),
        productName: item.products?.name || 'Prodotto',
        description: item.products?.description || ''
      }))
    };

    return res.status(200).json({ status: 'success', data: cleanData });
  } catch (error) {
    return next(error);
  }
}