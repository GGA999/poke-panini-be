import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
// @ts-ignore
import pkg from 'pg';
import { env } from '../../config/env.js';
import { supabaseAdmin } from '../../config/supabase.js';
import { AppError } from '../../shared/errors/app-error.js';
import { calculateRequestHash } from '../../shared/utils/idempotency.js';

const { Pool } = pkg;

// Configura il pool nativo solo se l'URL di connessione Postgres è presente
const pool = env.DATABASE_URL ? new Pool({ connectionString: env.DATABASE_URL }) : null;

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

      // 1. Verifica Idempotenza
      const cachedKey = await dbClient.query('SELECT * FROM public.idempotency_keys WHERE key = $1', [idempotencyKey]);
      if (cachedKey.rows.length > 0) {
        const row = cachedKey.rows[0];
        if (row.request_hash !== currentHash) {
          throw new AppError('CONFLICT', 409, 'Chiave di idempotenza già usata con un payload differente.');
        }
        await dbClient.query('ROLLBACK');
        return res.status(row.response_status || 200).json(row.response_body);
      }

      // 2. Validazione e Snapshot dei Prezzi
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

      // 3. Scrittura atomica dei dati
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

      const responseBody = { status: 'success', orderId, total: subtotal, message: 'Ordine creato con successo.' };

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
    // 1. Verifica Idempotenza
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

 // 2. Validazione e Calcolo Prezzi
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

    // 3. Scrittura sequenziale dei dati via client API
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

    const responseBody = { status: 'success', orderId, total: subtotal, message: 'Ordine creato con successo.' };

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